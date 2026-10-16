/// <reference types="svelte" />
/// <reference types="vite/client" />

interface Window {
  go: {
    main: {
      App: {
        Connect: (
          host: string,
          apiKey: string,
          name: string,
          environment: string,
          readOnly: boolean
        ) => Promise<{ id: string; host: string; name: string; environment: string; readOnly: boolean }>;
        Disconnect: () => Promise<void>;
        Session: () => Promise<{
          id: string;
          host: string;
          name: string;
          environment: string;
          readOnly: boolean;
        } | null>;
        ListProfiles: () => Promise<
          { id: string; name: string; host: string; environment: string; readOnly: boolean; hasKey: boolean }[]
        >;
        UseProfile: (
          id: string
        ) => Promise<{ id: string; host: string; name: string; environment: string; readOnly: boolean }>;
        DeleteProfile: (id: string) => Promise<void>;
        CopyText: (text: string) => Promise<void>;
        SaveTextFile: (defaultName: string, content: string) => Promise<string>;
        OpenTextFile: () => Promise<string>;
        Forward: (
          method: string,
          path: string,
          query: Record<string, string>,
          body: string
        ) => Promise<{ status: number; body: string }>;
        ForwardFor: (
          profileId: string,
          method: string,
          path: string,
          query: Record<string, string>,
          body: string
        ) => Promise<{ status: number; body: string }>;
        StartStream: (id: string, method: string, path: string, body: string) => Promise<void>;
        StopStream: (id: string) => Promise<void>;
      };
    };
  };
}
