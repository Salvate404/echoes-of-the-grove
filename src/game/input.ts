export class InputManager {
  keys = new Set<string>();
  mouseDeltaX = 0;
  mouseDeltaY = 0;
  mouseLocked = false;
  attackPressed = false;
  interactPressed = false;
  sprint = false;

  // Mobile joystick
  moveX = 0;
  moveZ = 0;
  mobileAttack = false;
  mobileInteract = false;

  private joystickActive = false;
  private joystickOrigin = { x: 0, y: 0 };
  private joystickPointerId: number | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['KeyI', 'KeyM', 'Escape'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    this.canvas.addEventListener('click', () => {
      if (!this.isMobile() && !this.mouseLocked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.mouseLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.mouseLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    this.setupMobileJoystick();
    this.setupMobileButtons();
  }

  isMobile(): boolean {
    return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
  }

  update(): void {
    this.attackPressed = this.keys.has('KeyJ') || this.mobileAttack;
    this.interactPressed = this.keys.has('KeyE') || this.mobileInteract;
    this.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    if (!this.isMobile()) {
      let x = 0;
      let z = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
      const len = Math.hypot(x, z);
      this.moveX = len > 0 ? x / len : 0;
      this.moveZ = len > 0 ? z / len : 0;
    }

    this.mobileAttack = false;
    this.mobileInteract = false;
  }

  consumeMouseDelta(): { x: number; y: number } {
    const d = { x: this.mouseDeltaX, y: this.mouseDeltaY };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return d;
  }

  private setupMobileJoystick(): void {
    const zone = document.getElementById('joystick-zone');
    const stick = document.getElementById('joystick-stick');
    if (!zone || !stick) return;

    const maxDist = 45;

    zone.addEventListener('pointerdown', (e) => {
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
      this.moveZ = cy / maxDist;
    });

    const resetJoystick = (e: PointerEvent) => {
      if (e.pointerId !== this.joystickPointerId) return;
      this.joystickActive = false;
      this.joystickPointerId = null;
      this.moveX = 0;
      this.moveZ = 0;
      stick.style.transform = 'translate(-50%, -50%)';
    };

    zone.addEventListener('pointerup', resetJoystick);
    zone.addEventListener('pointercancel', resetJoystick);
  }

  private setupMobileButtons(): void {
    document.getElementById('btn-attack')?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.mobileAttack = true;
    });
    document.getElementById('btn-interact')?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.mobileInteract = true;
    });
  }
}
