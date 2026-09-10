export class InputManager {
  keys = new Set<string>();
  private prevKeys = new Set<string>();

  moveX = 0;
  moveY = 0;
  sprint = false;

  private attackQueued = false;
  private interactQueued = false;

  private joystickActive = false;
  private joystickOrigin = { x: 0, y: 0 };
  private joystickPointerId: number | null = null;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['KeyI', 'KeyM', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    this.setupMobileJoystick();
    this.setupMobileButtons();
  }

  isMobile(): boolean {
    return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
  }

  update(): void {
    if (!this.isMobile()) {
      let x = 0;
      let y = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
      const len = Math.hypot(x, y);
      this.moveX = len > 0 ? x / len : 0;
      this.moveY = len > 0 ? y / len : 0;
    }

    this.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  /** Edge-triggered attack (J key or mobile button) */
  consumeAttack(): boolean {
    const keyEdge = this.keys.has('KeyJ') && !this.prevKeys.has('KeyJ');
    const pressed = keyEdge || this.attackQueued;
    this.attackQueued = false;
    return pressed;
  }

  /** Edge-triggered interact (E key or mobile button) */
  consumeInteract(): boolean {
    const keyEdge = this.keys.has('KeyE') && !this.prevKeys.has('KeyE');
    const pressed = keyEdge || this.interactQueued;
    this.interactQueued = false;
    return pressed;
  }

  /** Held interact for dialogue advance (E or click) */
  consumeInteractHeld(): boolean {
    const pressed = this.keys.has('KeyE') || this.interactQueued;
    this.interactQueued = false;
    return pressed;
  }

  /** Edge-triggered panel keys */
  consumeKey(code: string): boolean {
    const pressed = this.keys.has(code) && !this.prevKeys.has(code);
    return pressed;
  }

  endFrame(): void {
    this.prevKeys = new Set(this.keys);
  }

  private setupMobileJoystick(): void {
    const zone = document.getElementById('joystick-zone');
    const stick = document.getElementById('joystick-stick');
    if (!zone || !stick) return;

    const maxDist = 45;

    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.joystickActive = true;
      this.joystickPointerId = e.pointerId;
      this.joystickOrigin = { x: e.clientX, y: e.clientY };
      zone.setPointerCapture(e.pointerId);
    });

    zone.addEventListener('pointermove', (e) => {
      if (!this.joystickActive || e.pointerId !== this.joystickPointerId) return;
      const dx = e.clientX - this.joystickOrigin.x;
      const dy = e.clientY - this.joystickOrigin.y;
      const dist = Math.min(Math.hypot(dx, dy), maxDist);
      const angle = Math.atan2(dy, dx);
      const cx = Math.cos(angle) * dist;
      const cy = Math.sin(angle) * dist;
      stick.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;
      this.moveX = cx / maxDist;
      this.moveY = cy / maxDist;
    });

    const resetJoystick = (e: PointerEvent) => {
      if (e.pointerId !== this.joystickPointerId) return;
      this.joystickActive = false;
      this.joystickPointerId = null;
      this.moveX = 0;
      this.moveY = 0;
      stick.style.transform = 'translate(-50%, -50%)';
    };

    zone.addEventListener('pointerup', resetJoystick);
    zone.addEventListener('pointercancel', resetJoystick);
  }

  private setupMobileButtons(): void {
    const bind = (id: string, queue: 'attack' | 'interact') => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (queue === 'attack') this.attackQueued = true;
        else this.interactQueued = true;
      });
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (queue === 'attack') this.attackQueued = true;
        else this.interactQueued = true;
      }, { passive: false });
    };
    bind('btn-attack', 'attack');
    bind('btn-interact', 'interact');
  }
}
