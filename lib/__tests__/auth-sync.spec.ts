import { describe, it, expect, vi, afterEach } from "vitest";
import {
  AUTH_EVENT_KEY,
  broadcastAuthEvent,
  parseAuthSyncEvent,
  subscribeAuthEvents,
} from "../auth-sync";

describe("auth-sync", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("não deixa o evento gravado no localStorage", () => {
    broadcastAuthEvent({ type: "logout" });
    expect(localStorage.getItem(AUTH_EVENT_KEY)).toBeNull();
  });

  it("interpreta logout e login vindos de outra aba", () => {
    expect(
      parseAuthSyncEvent({
        key: AUTH_EVENT_KEY,
        newValue: JSON.stringify({ type: "logout" }),
        oldValue: null,
      }),
    ).toEqual({ type: "logout" });
    expect(
      parseAuthSyncEvent({
        key: AUTH_EVENT_KEY,
        newValue: JSON.stringify({ type: "login", userId: "u-2" }),
        oldValue: null,
      }),
    ).toEqual({ type: "login", userId: "u-2" });
  });

  it("trata a remoção do had_session como logout", () => {
    expect(
      parseAuthSyncEvent({ key: "had_session", newValue: null, oldValue: "1" }),
    ).toEqual({ type: "logout" });
    expect(
      parseAuthSyncEvent({ key: "had_session", newValue: "1", oldValue: null }),
    ).toBeNull();
  });

  it("ignora a remoção do próprio evento, chaves alheias e conteúdo inválido", () => {
    expect(
      parseAuthSyncEvent({ key: AUTH_EVENT_KEY, newValue: null, oldValue: "x" }),
    ).toBeNull();
    expect(
      parseAuthSyncEvent({ key: "outra", newValue: "1", oldValue: null }),
    ).toBeNull();
    expect(
      parseAuthSyncEvent({ key: AUTH_EVENT_KEY, newValue: "{", oldValue: null }),
    ).toBeNull();
    expect(
      parseAuthSyncEvent({
        key: AUTH_EVENT_KEY,
        newValue: JSON.stringify({ type: "login" }),
        oldValue: null,
      }),
    ).toBeNull();
  });

  it("entrega ao handler os eventos de storage e para após o unsubscribe", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeAuthEvents(handler);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: AUTH_EVENT_KEY,
        newValue: JSON.stringify({ type: "logout" }),
      }),
    );
    expect(handler).toHaveBeenCalledWith({ type: "logout" });

    unsubscribe();
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: AUTH_EVENT_KEY,
        newValue: JSON.stringify({ type: "logout" }),
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
