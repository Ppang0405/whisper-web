/* eslint-disable camelcase */
import { pipeline, env } from "@xenova/transformers";

// Disable local models
env.allowLocalModels = false;

// Define model factories
// Ensures only one model is created of each type
class PipelineFactory {
    static task = null;
    static model = null;
    static quantized = null;
    static instance = null;

    constructor(tokenizer, model, quantized) {
        this.tokenizer = tokenizer;
        this.model = model;
        this.quantized = quantized;
    }

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                quantized: this.quantized,
                progress_callback,
            });
        }

        return this.instance;
    }
}

self.addEventListener("message", async (event) => {
    const message = event.data;

    // Do some work...
    let summary = await summarize(
        message.text,
        message.model,
        message.quantized,
        message.maxLength,
        message.minLength,
    );
    if (summary === null) return;

    // Send the result back to the main thread
    self.postMessage({
        status: "complete",
        task: "summarization",
        data: summary,
    });
});

class SummarizationPipelineFactory extends PipelineFactory {
    static task = "summarization";
    static model = null;
    static quantized = null;
}

const summarize = async (
    text,
    model,
    quantized,
    maxLength,
    minLength,
) => {
    const p = SummarizationPipelineFactory;
    if (p.model !== model || p.quantized !== quantized) {
        // Invalidate model if different
        p.model = model;
        p.quantized = quantized;

        if (p.instance !== null) {
            (await p.getInstance()).dispose();
            p.instance = null;
        }
    }

    // Load summarization model
    let summarizer = await p.getInstance((data) => {
        self.postMessage(data);
    });

    // Actually run summarization
    let output = await summarizer(text, {
        max_length: maxLength,
        min_length: minLength,
        do_sample: false,
    }).catch((error) => {
        self.postMessage({
            status: "error",
            task: "summarization",
            data: error,
        });
        return null;
    });

    return output;
};