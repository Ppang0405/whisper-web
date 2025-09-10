import { useRef, useEffect } from "react";
import { FactCheckResponse, FactCheckResult } from "../services/OpenAIService";

interface Props {
    factCheckData: FactCheckResponse | null;
    onFactCheck: () => void;
    isFactCheckerBusy: boolean;
    error: string | null;
    hasApiKey: boolean;
}

export default function FactCheck({ 
    factCheckData, 
    onFactCheck, 
    isFactCheckerBusy, 
    error,
    hasApiKey 
}: Props) {
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
        if (!factCheckData) return;
        
        let content = `FACT CHECK REPORT\n`;
        content += `==================\n\n`;
        content += `Overall Accuracy Score: ${factCheckData.overall_assessment.accuracy_score}/100\n`;
        content += `Confidence Level: ${factCheckData.overall_assessment.confidence_level.toUpperCase()}\n`;
        content += `Summary: ${factCheckData.overall_assessment.summary}\n\n`;
        
        content += `CLAIM ANALYSIS\n`;
        content += `==============\n\n`;
        
        factCheckData.claims.forEach((claim, index) => {
            content += `${index + 1}. Claim: "${claim.claim}"\n`;
            content += `   Accuracy: ${claim.accuracy.toUpperCase()}\n`;
            content += `   Confidence: ${claim.confidence}/100\n`;
            content += `   Explanation: ${claim.explanation}\n`;
            if (claim.category) {
                content += `   Category: ${claim.category}\n`;
            }
            content += `\n`;
        });
        
        content += `RECOMMENDATIONS\n`;
        content += `===============\n`;
        factCheckData.verification_recommendations.forEach((rec, index) => {
            content += `${index + 1}. ${rec}\n`;
        });
        
        content += `\nRECOMMENDED SOURCES\n`;
        content += `===================\n`;
        factCheckData.sources_recommended.forEach((source, index) => {
            content += `${index + 1}. ${source}\n`;
        });

        const blob = new Blob([content], { type: "text/plain" });
        saveBlob(blob, "fact-check-report.txt");
    };

    const getAccuracyColor = (accuracy: string) => {
        switch (accuracy.toLowerCase()) {
            case 'accurate': return 'text-green-600 bg-green-50';
            case 'inaccurate': return 'text-red-600 bg-red-50';
            case 'uncertain': return 'text-yellow-600 bg-yellow-50';
            case 'needs_verification': return 'text-orange-600 bg-orange-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80) return 'text-green-600';
        if (confidence >= 60) return 'text-yellow-600';
        return 'text-red-600';
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
                divRef.current.scrollTop = divRef.current.scrollHeight;
            }
        }
    });

    return (
        <div className="w-full flex flex-col">
            <div className="w-full flex flex-row justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Fact Check
                </h3>
                <div className="flex flex-row gap-2">
                    <button
                        onClick={onFactCheck}
                        disabled={isFactCheckerBusy || !hasApiKey}
                        className={`text-white font-medium rounded-lg text-sm px-4 py-2 text-center inline-flex items-center ${
                            !hasApiKey
                                ? "bg-gray-400 cursor-not-allowed"
                                : isFactCheckerBusy
                                ? "bg-blue-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300"
                        }`}
                    >
                        {isFactCheckerBusy ? "Fact-Checking..." : "Fact Check Summary"}
                    </button>
                    {factCheckData && !isFactCheckerBusy && (
                        <button
                            onClick={exportTXT}
                            className="text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 text-center inline-flex items-center"
                        >
                            Export Report
                        </button>
                    )}
                </div>
            </div>

            {!hasApiKey && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                        <strong>API Key Required:</strong> Please add your OpenAI API key in the settings to enable fact-checking functionality.
                    </p>
                </div>
            )}

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">
                        <strong>Error:</strong> {error}
                    </p>
                </div>
            )}
            
            <div
                ref={divRef}
                className="w-full flex flex-col my-2 p-4 max-h-[20rem] overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
                {factCheckData ? (
                    <div className="w-full space-y-4">
                        {/* Overall Assessment */}
                        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Overall Assessment</h4>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Accuracy Score:</span>
                                <span className={`text-lg font-bold ${getConfidenceColor(factCheckData.overall_assessment.accuracy_score)}`}>
                                    {factCheckData.overall_assessment.accuracy_score}/100
                                </span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Confidence Level:</span>
                                <span className={`text-sm font-medium ${getConfidenceColor(
                                    factCheckData.overall_assessment.confidence_level === 'high' ? 90 :
                                    factCheckData.overall_assessment.confidence_level === 'medium' ? 70 : 40
                                )}`}>
                                    {factCheckData.overall_assessment.confidence_level.toUpperCase()}
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                {factCheckData.overall_assessment.summary}
                            </p>
                        </div>

                        {/* Claims Analysis */}
                        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Claims Analysis</h4>
                            <div className="space-y-3">
                                {factCheckData.claims.map((claim, index) => (
                                    <div key={index} className="border-l-4 border-gray-200 dark:border-gray-600 pl-3">
                                        <div className="flex items-start justify-between mb-1">
                                            <p className="text-sm text-gray-900 dark:text-white font-medium flex-1">
                                                {claim.claim}
                                            </p>
                                            <span className={`text-xs px-2 py-1 rounded-full ${getAccuracyColor(claim.accuracy)}`}>
                                                {claim.accuracy.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Confidence:</span>
                                            <span className={`text-xs font-medium ${getConfidenceColor(claim.confidence)}`}>
                                                {claim.confidence}/100
                                            </span>
                                        </div>
                                        {claim.explanation && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {claim.explanation}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Recommendations</h4>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                {factCheckData.verification_recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="text-blue-500 mr-2">•</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Recommended Sources */}
                        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Recommended Sources</h4>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                {factCheckData.sources_recommended.map((source, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="text-green-500 mr-2">•</span>
                                        {source}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                        {hasApiKey ? (
                            <p>Generate a summary and click "Fact Check Summary" to verify its accuracy.</p>
                        ) : (
                            <p>Please configure your OpenAI API key in settings to enable fact-checking.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}