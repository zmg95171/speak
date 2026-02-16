
import React, { useState, useEffect } from "react";
import { LLMConfig, ModelHealthCheckResult } from "../lib/types";
import { LLMService } from "../lib/llm";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: LLMConfig;
    onSave: (config: LLMConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    config,
    onSave,
}) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState<LLMConfig>(config);
    const [testResult, setTestResult] = useState<ModelHealthCheckResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        // Handle checkbox/boolean
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const llm = new LLMService(formData);
            const res = await llm.checkHealth();
            setTestResult(res);
        } catch (e: any) {
            setTestResult({
                status: "unavailable",
                latencyMs: 0,
                audioIn: false,
                audioOut: false,
                message: e.message,
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = () => {
        if (testResult?.status === "unavailable") {
            if (!confirm("This model failed the health check. Save anyway?")) return;
        }
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 border border-slate-700 shadow-xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Settings ⚙️</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Provider</label>
                        <select
                            name="provider"
                            value={formData.provider}
                            onChange={handleChange}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="gemini">Google Gemini</option>
                            <option value="openai">OpenAI (Not Impl)</option>
                            <option value="azure">Azure (Not Impl)</option>
                            <option value="local">Local (Not Impl)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">API Key</label>
                        <input
                            type="password"
                            name="apiKey"
                            value={formData.apiKey}
                            onChange={handleChange}
                            placeholder="Enter API Key"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Model Name</label>
                        <input
                            type="text"
                            name="model"
                            value={formData.model}
                            onChange={handleChange}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                            <input
                                type="checkbox"
                                name="supportsAudioIn"
                                checked={formData.supportsAudioIn}
                                onChange={handleChange}
                                className="rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                            />
                            Audio Input Support
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                            <input
                                type="checkbox"
                                name="supportsAudioOut"
                                checked={formData.supportsAudioOut}
                                onChange={handleChange}
                                className="rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                            />
                            Audio Output Support
                        </label>
                    </div>

                    {/* Test Section */}
                    <div className="border-t border-slate-700 pt-4 mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-300">Run Health Check</span>
                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={isTesting}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white disabled:opacity-50"
                            >
                                {isTesting ? "Testing..." : "Test Model"}
                            </button>
                        </div>

                        {testResult && (
                            <div className={`p-3 rounded-lg text-sm border ${testResult.status === "available" ? "bg-green-900/30 border-green-800 text-green-300" : "bg-red-900/30 border-red-800 text-red-300"
                                }`}>
                                <div className="font-bold flex justify-between">
                                    <span>{testResult.status === "available" ? "PASS" : "FAIL"}</span>
                                    <span>{testResult.latencyMs}ms</span>
                                </div>
                                <div className="mt-1">{testResult.message}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
