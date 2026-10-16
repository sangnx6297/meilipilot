export function Connect(host, apiKey, name, environment, readOnly) {
  return window.go.main.App.Connect(host, apiKey, name, environment, readOnly);
}

export function Disconnect() {
  return window.go.main.App.Disconnect();
}

export function Session() {
  return window.go.main.App.Session();
}

export function ListProfiles() {
  return window.go.main.App.ListProfiles();
}

export function UseProfile(id) {
  return window.go.main.App.UseProfile(id);
}

export function DeleteProfile(id) {
  return window.go.main.App.DeleteProfile(id);
}

export function CopyText(text) {
  return window.go.main.App.CopyText(text);
}

export function SaveTextFile(defaultName, content) {
  return window.go.main.App.SaveTextFile(defaultName, content);
}

export function OpenTextFile() {
  return window.go.main.App.OpenTextFile();
}

export function Forward(method, path, query, body) {
  return window.go.main.App.Forward(method, path, query, body);
}

export function ForwardFor(profileId, method, path, query, body) {
  return window.go.main.App.ForwardFor(profileId, method, path, query, body);
}

export function StartStream(id, method, path, body) {
  return window.go.main.App.StartStream(id, method, path, body);
}

export function StopStream(id) {
  return window.go.main.App.StopStream(id);
}
