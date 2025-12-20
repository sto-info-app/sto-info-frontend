export interface ScriptLoadOptions {
  id: string;
  src?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
  textContent?: string;
  attributes?: Record<string, string>;
  onLoad?: () => void;
  onError?: (event: Event) => void;
}
