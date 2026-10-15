export function Connect(
  host: string,
  apiKey: string,
  name: string,
  environment: string,
  readOnly: boolean
): Promise<{ id: string; host: string; name: string; environment: string; readOnly: boolean }>;
export function Disconnect(): Promise<void>;
export function Session(): Promise<{
  id: string;
  host: string;
  name: string;
  environment: string;
  readOnly: boolean;
} | null>;
export function ListProfiles(): Promise<
  { id: string; name: string; host: string; environment: string; readOnly: boolean; hasKey: boolean }[]
>;
export function UseProfile(
  id: string
): Promise<{ id: string; host: string; name: string; environment: string; readOnly: boolean }>;
export function DeleteProfile(id: string): Promise<void>;
export function CopyText(text: string): Promise<void>;
export function SaveTextFile(defaultName: string, content: string): Promise<string>;
export function Forward(
  method: string,
  path: string,
  query: Record<string, string>,
  body: string
): Promise<{ status: number; body: string }>;
export function ForwardFor(
  profileId: string,
  method: string,
  path: string,
  query: Record<string, string>,
  body: string
): Promise<{ status: number; body: string }>;
export function StartStream(id: string, method: string, path: string, body: string): Promise<void>;
export function StopStream(id: string): Promise<void>;
