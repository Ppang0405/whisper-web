import { useCallback, useMemo, useState } from "react";
import Constants from "../utils/Constants";
import OpenAIService, { FactCheckResponse, FactCheckResult } from "../services/OpenAIService";

interface FactCheckerState {
    isBusy: boolean;
    factCheckResults: FactCheckResponse | null;
    error: string | null;
}

interface FactCheckerConfig {
    model: string;
    strictness: 'low' | 'medium' | 'high';
    enableSourceVerification: boolean;
    openaiApiKey: string;
}

export interface FactChecker {
    isBusy: boolean;
    factCheckResults: FactCheckResponse | null;
    error: string | null;
    startFactCheck: (summary: string, originalTranscript: string) => Promise<void>;
    config: FactCheckerConfig;
    setModel: (model: string) => void;
    setStrictness: (strictness: 'low' | 'medium' | 'high') => void;
    setEnableSourceVerification: (enabled: boolean) => void;
    setOpenAIApiKey: (apiKey: string) => void;
    clearResults: () => void;
}

export function useFactChecker(): FactChecker {
    const [state, setState] = useState<FactCheckerState>({
        isBusy: false,
        factCheckResults: null,
        error: null,
    });

    const [config, setConfig] = useState<FactCheckerConfig>({
        model: Constants.DEFAULT_FACT_CHECKING_MODEL,
        strictness: Constants.DEFAULT_FACT_CHECKING_STRICTNESS,
        enableSourceVerification: Constants.DEFAULT_ENABLE_SOURCE_VERIFICATION,
        openaiApiKey: '', // User will need to provide this
    });

    const [openaiService, setOpenaiService] = useState<OpenAIService | null>(null);

    // Initialize OpenAI service when API key is provided
    useMemo(() => {
        if (config.openaiApiKey) {
            setOpenaiService(new OpenAIService(config.openaiApiKey));
        } else {
            setOpenaiService(null);
        }
    }, [config.openaiApiKey]);

    const startFactCheck = useCallback(async (summary: string, originalTranscript: string) => {
        if (!config.openaiApiKey) {
            setState(prev => ({
                ...prev,
                error: 'OpenAI API key is required for fact-checking'
            }));
            return;
        }

        if (!openaiService) {
            setState(prev => ({
                ...prev,
                error: 'OpenAI service not initialized'
            }));
            return;
        }

        setState(prev => ({
            ...prev,
            isBusy: true,
            error: null,
            factCheckResults: null,
        }));

        try {
            const results = await openaiService.factCheckSummary(
                summary,
                originalTranscript,
                {
                    model: config.model,
                    includeSourceVerification: config.enableSourceVerification,
                    strictness: config.strictness,
                }
            );

            setState(prev => ({
                ...prev,
                isBusy: false,
                factCheckResults: results,
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isBusy: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred during fact-checking'
            }));
        }
    }, [openaiService, config]);

    const setModel = useCallback((model: string) => {
        setConfig(prev => ({ ...prev, model }));
    }, []);

    const setStrictness = useCallback((strictness: 'low' | 'medium' | 'high') => {
        setConfig(prev => ({ ...prev, strictness }));
    }, []);

    const setEnableSourceVerification = useCallback((enabled: boolean) => {
        setConfig(prev => ({ ...prev, enableSourceVerification: enabled }));
    }, []);

    const setOpenAIApiKey = useCallback((apiKey: string) => {
        setConfig(prev => ({ ...prev, openaiApiKey: apiKey }));
    }, []);

    const clearResults = useCallback(() => {
        setState(prev => ({
            ...prev,
            factCheckResults: null,
            error: null,
        }));
    }, []);

    const factChecker: FactChecker = useMemo(() => ({
        isBusy: state.isBusy,
        factCheckResults: state.factCheckResults,
        error: state.error,
        startFactCheck,
        config,
        setModel,
        setStrictness,
        setEnableSourceVerification,
        setOpenAIApiKey,
        clearResults,
    }), [
        state.isBusy,
        state.factCheckResults,
        state.error,
        startFactCheck,
        config,
        setModel,
        setStrictness,
        setEnableSourceVerification,
        setOpenAIApiKey,
        clearResults,
    ]);

    return factChecker;
}