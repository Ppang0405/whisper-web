import { useCallback, useMemo, useState } from "react";
import Constants from "../utils/Constants";

interface ProgressItem {
    file: string;
    loaded: number;
    progress: number;
    total: number;
    name: string;
    status: string;
}

interface SummarizerUpdateData {
    data: string;
    text: string;
}

interface SummarizerCompleteData {
    data: {
        summary_text: string;
    };
}

export interface SummarizerData {
    isBusy: boolean;
    summary: string;
}

export interface Summarizer {
    isBusy: boolean;
    isModelLoading: boolean;
    progressItems: ProgressItem[];
    start: (text: string) => void;
    output?: SummarizerData;
    model: string;
    setModel: (model: string) => void;
    quantized: boolean;
    setQuantized: (quantized: boolean) => void;
    maxLength: number;
    setMaxLength: (maxLength: number) => void;
    minLength: number;
    setMinLength: (minLength: number) => void;
}

export function useSummarizer(): Summarizer {
    const [summary, setSummary] = useState<SummarizerData | undefined>(undefined);
    const [isBusy, setIsBusy] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

    const webWorker = useMemo(() => {
        const worker = new Worker(new URL("../summarization-worker.js", import.meta.url), {
            type: "module",
        });
        
        worker.addEventListener("message", (event) => {
            const message = event.data;
            // Update the state with the result
            switch (message.status) {
                case "progress":
                    // Model file progress: update one of the progress items.
                    setProgressItems((prev) =>
                        prev.map((item) => {
                            if (item.file === message.file) {
                                return { ...item, progress: message.progress };
                            }
                            return item;
                        }),
                    );
                    break;
                case "update":
                    // Received partial update
                    const updateMessage = message as SummarizerUpdateData;
                    setSummary({
                        isBusy: true,
                        summary: updateMessage.data,
                    });
                    break;
                case "complete":
                    // Received complete summary
                    const completeMessage = message as SummarizerCompleteData;
                    setSummary({
                        isBusy: false,
                        summary: completeMessage.data.summary_text,
                    });
                    setIsBusy(false);
                    break;

                case "initiate":
                    // Model file start load: add a new progress item to the list.
                    setIsModelLoading(true);
                    setProgressItems((prev) => [...prev, message]);
                    break;
                case "ready":
                    setIsModelLoading(false);
                    break;
                case "error":
                    setIsBusy(false);
                    alert(
                        `${message.data.message} Error occurred during summarization. Please try again.`
                    );
                    break;
                case "done":
                    // Model file loaded: remove the progress item from the list.
                    setProgressItems((prev) =>
                        prev.filter((item) => item.file !== message.file),
                    );
                    break;

                default:
                    break;
            }
        });
        
        return worker;
    }, []);

    const [model, setModel] = useState<string>(Constants.DEFAULT_SUMMARIZATION_MODEL);
    const [quantized, setQuantized] = useState<boolean>(
        Constants.DEFAULT_SUMMARIZATION_QUANTIZED,
    );
    const [maxLength, setMaxLength] = useState<number>(
        Constants.DEFAULT_SUMMARIZATION_MAX_LENGTH,
    );
    const [minLength, setMinLength] = useState<number>(
        Constants.DEFAULT_SUMMARIZATION_MIN_LENGTH,
    );

    const postRequest = useCallback(
        async (text: string) => {
            if (text.trim()) {
                setSummary(undefined);
                setIsBusy(true);

                webWorker.postMessage({
                    text: text.trim(),
                    model,
                    quantized,
                    maxLength,
                    minLength,
                });
            }
        },
        [webWorker, model, quantized, maxLength, minLength],
    );

    const summarizer = useMemo(() => {
        return {
            isBusy,
            isModelLoading,
            progressItems,
            start: postRequest,
            output: summary,
            model,
            setModel,
            quantized,
            setQuantized,
            maxLength,
            setMaxLength,
            minLength,
            setMinLength,
        };
    }, [
        isBusy,
        isModelLoading,
        progressItems,
        postRequest,
        summary,
        model,
        quantized,
        maxLength,
        minLength,
    ]);

    return summarizer;
}