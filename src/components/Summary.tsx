import { useRef, useEffect } from "react";

import { SummarizerData } from "../hooks/useSummarizer";

interface Props {
    summaryData: SummarizerData | undefined;
    onGenerateSummary: () => void;
    isSummarizerBusy: boolean;
}

export default function Summary({ summaryData, onGenerateSummary, isSummarizerBusy }: Props) {
    const divRef = useRef<HTMLDivElement>(null);

    const saveBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportTXT = () => {
        const text = summaryData?.summary || "";
        const blob = new Blob([text], { type: "text/plain" });
        saveBlob(blob, "summary.txt");
    };

    // Scroll to the bottom when the component updates
    useEffect(() => {
        if (divRef.current) {
            const diff = Math.abs(
                divRef.current.offsetHeight +
                    divRef.current.scrollTop -
                    divRef.current.scrollHeight,
            );

            if (diff <= 64) {
                // We're close enough to the bottom, so scroll to the bottom
                divRef.current.scrollTop = divRef.current.scrollHeight;
            }
        }
    });

    return (
        <div className="w-full flex flex-col">
            <div className="w-full flex flex-row justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Summary
                </h3>
                <div className="flex flex-row gap-2">
                    <button
                        onClick={onGenerateSummary}
                        disabled={isSummarizerBusy}
                        className={`text-white font-medium rounded-lg text-sm px-4 py-2 text-center inline-flex items-center ${
                            isSummarizerBusy
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300"
                        }`}
                    >
                        {isSummarizerBusy ? "Generating..." : "Generate Summary"}
                    </button>
                    {summaryData && !isSummarizerBusy && (
                        <button
                            onClick={exportTXT}
                            className="text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 text-center inline-flex items-center"
                        >
                            Export TXT
                        </button>
                    )}
                </div>
            </div>
            
            <div
                ref={divRef}
                className="w-full flex flex-col my-2 p-4 max-h-[20rem] overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
                {summaryData ? (
                    <div className="w-full">
                        {summaryData.summary ? (
                            <div className="text-gray-900 dark:text-white leading-relaxed">
                                {summaryData.summary}
                            </div>
                        ) : (
                            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                                No summary available. Generate a summary from the transcript.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                        Generate a summary to see the results here.
                    </div>
                )}
            </div>
        </div>
    );
}