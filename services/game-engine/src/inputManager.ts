/**
 * InputManager.ts
 * CHANGELOG v1.0.0: Centralized input handling
 * - Pointer lock management
 * - Camera-relative movement calculation
 * - Action binding and remapping
 * - Gamepad support stub
 */

// === TYPES ===

export interface InputState {
  // Movement
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  
  // Combat
  attack: boolean;
  heavyAttack: boolean; // Hold attack
  block: boolean;
  dodge: boolean;
  
  // Skills (1-4)
  skill1: boolean;
  skill2: boolean;
  skill3: boolean;
  skill4: boolean;
  
  // Items (1-4 or 5-8)
  item1: boolean;
  item2: boolean;
  item3: boolean;
  item4: boolean;
  
  // Interaction
  interact: boolean;
  rest: boolean;
  
  // Camera
  mouseX: number;
  mouseY: number;
  mouseDeltaX: number;
  mouseDeltaY: number;
  
  // Meta
  pause: boolean;
}

export interface InputConfig {
  // Mouse
  mouseSensitivity: number;
  invertY: boolean;
  
  // Keybindings
  bindings: Record<string, string[]>;
  
  // Timing
  holdThreshold: number; // ms before attack becomes heavy
  dodgeBufferTime: number; // ms to buffer dodge input
}

// === DEFAULTS ===

export const DEFAULT_INPUT_STATE: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  attack: false,
  heavyAttack: false,
  block: false,
  dodge: false,
  skill1: false,
  skill2: false,
  skill3: false,
  skill4: false,
  item1: false,
  item2: false,
  item3: false,
  item4: false,
  interact: false,
  rest: false,
  mouseX: 0,
  mouseY: 0,
  mouseDeltaX: 0,
  mouseDeltaY: 0,
  pause: false,
};

export const DEFAULT_INPUT_CONFIG: InputConfig = {
  mouseSensitivity: 0.15,
  invertY: false,
  holdThreshold: 300,
  dodgeBufferTime: 150,
  bindings: {
    forward: ['KeyW', 'ArrowUp'],
    backward: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    dodge: ['Space', 'KeyC', 'ControlLeft'],
    interact: ['KeyE', 'KeyF'],
    rest: ['KeyR'],
    skill1: ['Digit1'],
    skill2: ['Digit2'],
    skill3: ['Digit3'],
    skill4: ['Digit4'],
    item1: ['Digit5'],
    item2: ['Digit6'],
    item3: ['Digit7'],
    item4: ['Digit8'],
    pause: ['Escape', 'KeyP'],
  },
};

// === INPUT MANAGER CLASS ===

export class InputManager {
  private state: InputState;
  private config: InputConfig;
  private isPointerLocked: boolean = false;
  private attackHoldStart: number = 0;
  private listeners: (() => void)[] = [];
  
  constructor(config: Partial<InputConfig> = {}) {
    this.state = { ...DEFAULT_INPUT_STATE };
    this.config = { ...DEFAULT_INPUT_CONFIG, ...config };
  }
  
  public getState(): InputState {
    return { ...this.state };
  }
  
  public isLocked(): boolean {
    return this.isPointerLocked;
  }
  
  public attach(element: HTMLElement): void {
    // Keyboard
    const handleKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
    const handleKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);
    
    // Mouse
    const handleMouseDown = (e: MouseEvent) => this.onMouseDown(e);
    const handleMouseUp = (e: MouseEvent) => this.onMouseUp(e);
    const handleMouseMove = (e: MouseEvent) => this.onMouseMove(e);
    const handleClick = () => this.requestPointerLock(element);
    
    // Pointer lock
    const handleLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === element;
    };
    
    // Prevent context menu
    const handleContextMenu = (e: Event) => e.preventDefault();
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    element.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handleLockChange);
    element.addEventListener('contextmenu', handleContextMenu);
    
    // Store cleanup functions
    this.listeners.push(() => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handleLockChange);
      element.removeEventListener('contextmenu', handleContextMenu);
    });
  }
  
  public detach(): void {
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];
  }
  
  private requestPointerLock(element: HTMLElement): void {
    if (!this.isPointerLocked) {
      element.requestPointerLock();
    }
  }
  
  private codeToAction(code: string): string | null {
    for (const [action, codes] of Object.entries(this.config.bindings)) {
      if (codes.includes(code)) return action;
    }
    return null;
  }
  
  private onKeyDown(e: KeyboardEvent): void {
    const action = this.codeToAction(e.code);
    if (!action) return;
    
    switch (action) {
      case 'forward': this.state.forward = true; break;
      case 'backward': this.state.backward = true; break;
      case 'left': this.state.left = true; break;
      case 'right': this.state.right = true; break;
      case 'sprint': this.state.sprint = true; break;
      case 'dodge':
        this.state.dodge = true;
        // Auto-reset after buffer
        setTimeout(() => { this.state.dodge = false; }, this.config.dodgeBufferTime);
        break;
      case 'interact': this.state.interact = true; break;
      case 'rest': this.state.rest = true; break;
      case 'skill1': this.state.skill1 = true; break;
      case 'skill2': this.state.skill2 = true; break;
      case 'skill3': this.state.skill3 = true; break;
      case 'skill4': this.state.skill4 = true; break;
      case 'item1': this.state.item1 = true; break;
      case 'item2': this.state.item2 = true; break;
      case 'item3': this.state.item3 = true; break;
      case 'item4': this.state.item4 = true; break;
      case 'pause': this.state.pause = true; break;
    }
  }
  
  private onKeyUp(e: KeyboardEvent): void {
    const action = this.codeToAction(e.code);
    if (!action) return;
    
    switch (action) {
      case 'forward': this.state.forward = false; break;
      case 'backward': this.state.backward = false; break;
      case 'left': this.state.left = false; break;
      case 'right': this.state.right = false; break;
      case 'sprint': this.state.sprint = false; break;
      case 'interact': this.state.interact = false; break;
      case 'rest': this.state.rest = false; break;
      case 'skill1': this.state.skill1 = false; break;
      case 'skill2': this.state.skill2 = false; break;
      case 'skill3': this.state.skill3 = false; break;
      case 'skill4': this.state.skill4 = false; break;
      case 'item1': this.state.item1 = false; break;
      case 'item2': this.state.item2 = false; break;
      case 'item3': this.state.item3 = false; break;
      case 'item4': this.state.item4 = false; break;
      case 'pause': this.state.pause = false; break;
    }
  }
  
  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.state.attack = true;
      this.attackHoldStart = Date.now();
    }
    if (e.button === 2) {
      this.state.block = true;
    }
  }
  
  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      // Check if it was a heavy attack (held)
      const holdDuration = Date.now() - this.attackHoldStart;
      this.state.heavyAttack = holdDuration >= this.config.holdThreshold;
      this.state.attack = false;
      
      // Reset heavy attack after a frame
      setTimeout(() => { this.state.heavyAttack = false; }, 50);
    }
    if (e.button === 2) {
      this.state.block = false;
    }
  }
  
  private onMouseMove(e: MouseEvent): void {
    if (!this.isPointerLocked) {
      this.state.mouseDeltaX = 0;
      this.state.mouseDeltaY = 0;
      return;
    }
    
    const sensitivity = this.config.mouseSensitivity;
    this.state.mouseDeltaX = e.movementX * sensitivity;
    this.state.mouseDeltaY = e.movementY * sensitivity * (this.config.invertY ? -1 : 1);
    this.state.mouseX += this.state.mouseDeltaX;
    this.state.mouseY += this.state.mouseDeltaY;
  }
  
  // Reset deltas after processing
  public clearDeltas(): void {
    this.state.mouseDeltaX = 0;
    this.state.mouseDeltaY = 0;
  }
  
  // Update config
  public setConfig(config: Partial<InputConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// === CAMERA-RELATIVE MOVEMENT ===

export function getCameraRelativeMovement(
  input: InputState,
  cameraYaw: number
): { x: number; z: number; normalized: boolean } {
  let moveX = 0;
  let moveZ = 0;
  
  if (input.forward) moveZ -= 1;
  if (input.backward) moveZ += 1;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  
  // No movement
  if (moveX === 0 && moveZ === 0) {
    return { x: 0, z: 0, normalized: false };
  }
  
  // Normalize diagonal movement
  const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
  moveX /= length;
  moveZ /= length;
  
  // Rotate by camera yaw
  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  
  return {
    x: moveX * cos - moveZ * sin,
    z: moveX * sin + moveZ * cos,
    normalized: true,
  };
}

// === FACING DIRECTION ===

export function getFacingRotation(
  moveX: number,
  moveZ: number,
  currentRotation: number,
  turnSpeed: number,
  deltaTime: number
): number {
  if (moveX === 0 && moveZ === 0) {
    return currentRotation;
  }
  
  const targetRotation = Math.atan2(moveX, -moveZ);
  
  // Smooth rotation
  let diff = targetRotation - currentRotation;
  
  // Normalize to [-PI, PI]
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  
  const maxTurn = turnSpeed * deltaTime;
  const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
  
  return currentRotation + turn;
}

export default InputManager;
