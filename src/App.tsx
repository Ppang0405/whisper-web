import { AudioManager } from "./components/AudioManager";
import Transcript from "./components/Transcript";
import Summary from "./components/Summary";
import FactCheck from "./components/FactCheck";
import { useTranscriber } from "./hooks/useTranscriber";
import { useSummarizer } from "./hooks/useSummarizer";
import { useFactChecker } from "./hooks/useFactChecker";

function App() {
    const transcriber = useTranscriber();
    const summarizer = useSummarizer();
    const factChecker = useFactChecker();

    const handleGenerateSummary = () => {
        if (transcriber.output) {
            const text = transcriber.output.chunks.map(chunk => chunk.text).join(" ");
            summarizer.start(text);
        }
    };

    const handleFactCheck = () => {
        if (summarizer.output && transcriber.output) {
            const originalText = transcriber.output.chunks.map(chunk => chunk.text).join(" ");
            factChecker.startFactCheck(summarizer.output.summary, originalText);
        }
    };

    return (
        <div className='flex justify-center items-center min-h-screen'>
            <div className='container flex flex-col justify-center items-center'>
                <h1 className='text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl text-center'>
                    Whisper Web
                </h1>
                <h2 className='mt-3 mb-5 px-4 text-center text-1xl font-semibold tracking-tight text-slate-900 sm:text-2xl'>
                    ML-powered speech recognition directly in your browser
                </h2>
                <AudioManager transcriber={transcriber} summarizer={summarizer} factChecker={factChecker} />
                <Transcript transcribedData={transcriber.output} />
                <Summary 
                    summaryData={summarizer.output} 
                    onGenerateSummary={handleGenerateSummary}
                    isSummarizerBusy={summarizer.isBusy}
                />
                <FactCheck 
                    factCheckData={factChecker.factCheckResults}
                    onFactCheck={handleFactCheck}
                    isFactCheckerBusy={factChecker.isBusy}
                    error={factChecker.error}
                    hasApiKey={!!factChecker.config.openaiApiKey}
                />
            </div>

            <div className='absolute bottom-4'>
                Made with{" "}
                <a
                    className='underline'
                    href='https://github.com/xenova/transformers.js'
                >
                    🤗 Transformers.js
                </a>
            </div>
        </div>
    );
}

export default App;
