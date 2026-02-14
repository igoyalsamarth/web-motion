export interface NavigateAction {
  description: string;
  action: 'navigate';
  url: string;
}

export interface ClickAction {
  description: string;
  action: 'click';
  selector: string;
}

export interface ScriptAction {
  description: string;
  action: 'script';
  script: string;
}

export interface ConditionalCondition {
  pathPattern: string;
  action: 'navigate' | 'click' | 'script';
  url?: string;
  selector?: string;
  script?: string;
}

export interface ConditionalAction {
  description: string;
  action: 'conditional';
  conditions: ConditionalCondition[];
}

export type KeybindAction = NavigateAction | ClickAction | ScriptAction | ConditionalAction;

export interface DomainKeybinds {
  [keySequence: string]: KeybindAction;
}

export interface DefaultKeybinds {
  [domain: string]: DomainKeybinds;
}
