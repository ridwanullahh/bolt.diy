import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class PuterProvider extends BaseProvider {
  name = 'Puter';
  getApiKeyLink = 'https://puter.com/app/dev-center';
  labelForGetApiKey = 'Get Puter API Key';
  icon = 'i-simple-icons:puter';

  config = {
    apiTokenKey: 'PUTER_API_KEY',
  };

  staticModels: ModelInfo[] = [
    { 
      name: 'claude-sonnet-4', 
      label: 'Claude Sonnet 4 (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 200000 
    },
    { 
      name: 'gpt-4o', 
      label: 'GPT-4o (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 128000 
    },
    { 
      name: 'grok-beta', 
      label: 'Grok Beta (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 131072 
    },
    { 
      name: 'gpt-5', 
      label: 'GPT-5 (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 200000 
    },
    { 
      name: 'claude-opus-4', 
      label: 'Claude Opus 4 (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 200000 
    },
    { 
      name: 'gpt-4.1', 
      label: 'GPT-4.1 (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 128000 
    },
    { 
      name: 'gpt-4.1-mini', 
      label: 'GPT-4.1 Mini (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 128000 
    },
    { 
      name: 'gpt-4.1-nano', 
      label: 'GPT-4.1 Nano (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 128000 
    },
    { 
      name: 'deepseek-chat', 
      label: 'DeepSeek Chat (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 64000 
    },
    { 
      name: 'deepseek-reasoner', 
      label: 'DeepSeek Reasoner (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 64000 
    },
    { 
      name: 'gemini-2.0-flash', 
      label: 'Gemini 2.0 Flash (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 1000000 
    },
    { 
      name: 'gemini-1.5-flash', 
      label: 'Gemini 1.5 Flash (Puter)', 
      provider: 'Puter', 
      maxTokenAllowed: 1000000 
    }
  ];

  // Support for custom models through dynamic loading
  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>
  ): Promise<ModelInfo[]> {
    try {
      // Check if user has configured custom models
      const customModels = settings?.customModels;
      if (!customModels || !Array.isArray(customModels)) {
        return [];
      }

      return customModels.map((model: any) => ({
        name: model.name || model.id,
        label: model.label || model.name || model.id,
        provider: 'Puter',
        maxTokenAllowed: model.maxTokens || 128000
      }));
    } catch (error) {
      console.error('Error loading Puter custom models:', error);
      return [];
    }
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'PUTER_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    // Create a custom implementation for Puter.js integration
    return this.createPuterModel(model, apiKey);
  }

  private createPuterModel(model: string, apiKey: string): LanguageModelV1 {
    // For now, we'll use a proxy approach that mimics the OpenAI interface
    // but internally uses Puter.js SDK
    const openai = createOpenAI({
      baseURL: 'https://api.puter.com/v1',
      apiKey,
      compatibility: 'compatible',
    });

    // Wrap the model to add Puter-specific functionality
    const puterModel = openai(model);
    
    // Add Puter.js specific enhancements
    return new Proxy(puterModel, {
      get(target, prop, receiver) {
        if (prop === 'doGenerate') {
          return async function(options: any) {
            try {
              // Add Puter-specific headers and options
              const enhancedOptions = {
                ...options,
                headers: {
                  ...options.headers,
                  'X-Puter-SDK': 'bolt.diy',
                  'X-Puter-Version': 'v2'
                }
              };
              
              return await target.doGenerate(enhancedOptions);
            } catch (error) {
              console.error('Puter model generation error:', error);
              throw error;
            }
          };
        }
        
        if (prop === 'doStream') {
          return async function(options: any) {
            try {
              // Add Puter-specific headers and options
              const enhancedOptions = {
                ...options,
                headers: {
                  ...options.headers,
                  'X-Puter-SDK': 'bolt.diy',
                  'X-Puter-Version': 'v2'
                }
              };
              
              return await target.doStream(enhancedOptions);
            } catch (error) {
              console.error('Puter model streaming error:', error);
              throw error;
            }
          };
        }
        
        return Reflect.get(target, prop, receiver);
      }
    });
  }
}
