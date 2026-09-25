import { readLlmConfig, writeLlmConfig, LlmConfig } from './config';

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export interface OllamaDetectResult {
  available: boolean;
  host: string;
  models: OllamaModel[];
}

function ollamaHost(): string {
  return process.env.OLLAMA_HOST || readLlmConfig().host || 'http://localhost:11434';
}

export async function detectOllama(): Promise<OllamaDetectResult> {
  const host = ollamaHost();
  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { available: false, host, models: [] };
    const data = await res.json() as { models?: OllamaModel[] };
    return { available: true, host, models: data.models ?? [] };
  } catch {
    return { available: false, host, models: [] };
  }
}

export async function listOllamaModels(): Promise<string[]> {
  const result = await detectOllama();
  return result.models.map(m => m.name);
}

export async function configureLlm(modelName: string): Promise<LlmConfig> {
  const host = ollamaHost();
  const llm: LlmConfig = { host, model: modelName, enabled: true };
  writeLlmConfig(llm);
  return llm;
}
