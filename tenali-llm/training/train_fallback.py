import os
import torch
import json
import traceback
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM, 
    AutoTokenizer, 
    TrainingArguments, 
    Trainer,
    BitsAndBytesConfig
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
from datetime import datetime

# Import status tracker
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from scripts.check_training import update_status

# Configuration
MODEL_ID = "microsoft/Phi-3-mini-4k-instruct"

# Find the root directory of tenali-llm
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_DIR = os.path.join(ROOT_DIR, "quantra_phi3_adapters")
DATASET_PATH = os.path.join(ROOT_DIR, "training_data", "quantra_full_dataset.json")

def train_fallback():
    print("Quantra: Initializing Fallback Training (HuggingFace PEFT)...")
    
    # WINDOWS BITSANDBYTES FIX: Add torch/lib to DLL path
    if os.name == 'nt':
        import torch
        torch_lib_path = os.path.join(os.path.dirname(torch.__file__), "lib")
        if os.path.exists(torch_lib_path):
            os.add_dll_directory(torch_lib_path)
            print(f"Added DLL directory: {torch_lib_path}")

    update_status("IN_PROGRESS", "Initializing model and checking hardware compatibility...")
    
    # 1. Hardware Check
    if not torch.cuda.is_available():
        error_msg = "FAILED: CUDA not available. Ensure you are in 'quantra_stable' environment."
        print(error_msg)
        update_status("FAILED", error_msg)
        return
    else:
        print(f"CUDA Hardware Detected: {torch.cuda.get_device_name(0)}")

    # 2. 4-bit Quantization Config
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float32, # More stable than float16 on Windows
        bnb_4bit_use_double_quant=True,
    )

    try:
        # Load Model Config and Fix RoPE Scaling for Phi-3 compatibility
        from transformers import AutoConfig
        print(f"Patching config for: {MODEL_ID}")
        config_obj = AutoConfig.from_pretrained(MODEL_ID, trust_remote_code=True)
        if hasattr(config_obj, "rope_scaling") and config_obj.rope_scaling is not None:
            if "type" in config_obj.rope_scaling:
                config_obj.rope_scaling["rope_type"] = config_obj.rope_scaling["type"]

        # Load Model
        print(f"Loading base model: {MODEL_ID}")
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            config=config_obj,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            attn_implementation="eager" # Revert to eager
        )
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.padding_side = "right"
        model.config.pad_token_id = tokenizer.pad_token_id

        # 3. Prepare for LoRA
        print("Adopting LoRA adapters...")
        model = prepare_model_for_kbit_training(model)
        model.gradient_checkpointing_enable() 
        
        config = LoraConfig(
            r=8,
            lora_alpha=16,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type=TaskType.CAUSAL_LM
        )
        model = get_peft_model(model, config)

        # 4. Load Dataset
        print(f"Loading dataset from: {DATASET_PATH}")
        dataset = load_dataset("json", data_files=DATASET_PATH, split="train")

        def format_func(sample):
            instr = sample.get("instruction", "")
            out = sample.get("output", "")
            return f"### Instruction:\n{instr}\n\n### Response:\n{out}{tokenizer.eos_token}"

        # 5. Training Args
        training_args = TrainingArguments(
            output_dir=OUTPUT_DIR,
            per_device_train_batch_size=1,
            gradient_accumulation_steps=4,
            learning_rate=2e-4,
            logging_steps=2,
            max_steps=50,
            fp16=False, # Disable fp16 for stability
            optim="paged_adamw_8bit",
            remove_unused_columns=False,
            report_to="none",
            gradient_checkpointing=True
        )

        def bnb_data_collator(elements):
            texts = [format_func(el) for el in elements]
            inputs = tokenizer(texts, padding=True, truncation=True, max_length=512, return_tensors="pt")
            inputs["labels"] = inputs["input_ids"].clone()
            # Mask labels for padding tokens
            inputs["labels"][inputs["labels"] == tokenizer.pad_token_id] = -100
            return inputs

        update_status("TRAINING", "Fine-tuning process started. Processing 50 steps...")

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            data_collator=bnb_data_collator
        )

        model.config.use_cache = False
        print("Starting training loop...")
        trainer.train()
        
        # 6. Save
        print(f"Saving adapters to {OUTPUT_DIR}...")
        model.save_pretrained(OUTPUT_DIR)
        update_status("COMPLETED", f"Training successful. Adapters saved to {OUTPUT_DIR}.")
        print(f"Training success. Adapters saved to {OUTPUT_DIR}")

    except Exception as e:
        full_err = traceback.format_exc()
        update_status("FAILED", f"Critical Error during training: {str(e)}")
        print(f"ERROR DETAILS:\n{full_err}")

if __name__ == "__main__":
    train_fallback()
