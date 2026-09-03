/**
 * @module SettingBuilder
 * @description
 * Imperative Obsidian-compatible fluent builder API for settings tabs and modal panels.
 * Allows extension developers to build native-styled setting rows into an HTMLElement.
 *
 * @example
 * ```ts
 * new SettingBuilder(containerEl)
 *   .setName('Daily Note Format')
 *   .setDesc('Date format token string (e.g. YYYY-MM-DD)')
 *   .addText(text => text.setValue('YYYY-MM-DD').onChange(v => console.log(v)))
 *   .addToggle(toggle => toggle.setValue(true).onChange(v => console.log(v)));
 * ```
 */

export class SettingBuilder {
  public settingEl: HTMLElement;
  public infoEl: HTMLElement;
  public nameEl: HTMLElement;
  public descEl: HTMLElement;
  public controlEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
    this.settingEl.className =
      'flint-setting-item flex items-center justify-between p-4 border-b border-[var(--flint-border-subtle,#282828)] last:border-b-0';

    this.infoEl = document.createElement('div');
    this.infoEl.className = 'flex flex-col pr-4 min-w-0 flex-1';

    this.nameEl = document.createElement('span');
    this.nameEl.className = 'text-[13px] font-normal text-[var(--flint-text-secondary,#dcddde)]';

    this.descEl = document.createElement('span');
    this.descEl.className = 'text-[11px] text-[var(--flint-text-muted,#777777)] mt-0.5';

    this.infoEl.appendChild(this.nameEl);
    this.infoEl.appendChild(this.descEl);

    this.controlEl = document.createElement('div');
    this.controlEl.className = 'flex items-center gap-2 shrink-0';

    this.settingEl.appendChild(this.infoEl);
    this.settingEl.appendChild(this.controlEl);

    containerEl.appendChild(this.settingEl);
  }

  public setName(name: string): this {
    this.nameEl.textContent = name;
    return this;
  }

  public setDesc(desc: string): this {
    this.descEl.textContent = desc;
    return this;
  }

  public addToggle(
    callback: (toggle: {
      setValue: (val: boolean) => any;
      onChange: (cb: (val: boolean) => void) => any;
      setDisabled: (disabled: boolean) => any;
    }) => void
  ): this {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'relative inline-flex w-[34px] h-[20px] shrink-0 cursor-pointer rounded-full p-[2px] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.35)] focus-visible:ring-1 focus-visible:ring-[var(--flint-accent,#ea580c)]';

    const knob = document.createElement('span');
    knob.className =
      'pointer-events-none inline-block h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)]';
    btn.appendChild(knob);

    let isChecked = false;
    let changeHandler: ((val: boolean) => void) | null = null;

    const renderState = () => {
      if (isChecked) {
        btn.className =
          'relative inline-flex w-[34px] h-[20px] shrink-0 cursor-pointer rounded-full p-[2px] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.35)] bg-[var(--flint-accent,#ea580c)] border border-transparent';
        knob.className =
          'pointer-events-none inline-block h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] translate-x-[14px]';
      } else {
        btn.className =
          'relative inline-flex w-[34px] h-[20px] shrink-0 cursor-pointer rounded-full p-[2px] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.35)] bg-[var(--flint-border-strong,#333333)] border border-[var(--flint-border-base,#404040)]';
        knob.className =
          'pointer-events-none inline-block h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] translate-x-0';
      }
    };

    btn.addEventListener('click', () => {
      isChecked = !isChecked;
      renderState();
      if (changeHandler) changeHandler(isChecked);
    });

    renderState();
    this.controlEl.appendChild(btn);

    const controller = {
      setValue: (val: boolean) => {
        isChecked = val;
        renderState();
        return controller;
      },
      onChange: (cb: (val: boolean) => void) => {
        changeHandler = cb;
        return controller;
      },
      setDisabled: (disabled: boolean) => {
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.4' : '1';
        btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
        return controller;
      },
    };

    callback(controller);
    return this;
  }

  public addButton(
    callback: (btn: {
      setButtonText: (text: string) => any;
      setCta: () => any;
      setWarning: () => any;
      onClick: (cb: () => void) => any;
      setDisabled: (disabled: boolean) => any;
    }) => void
  ): this {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'obsidian-btn px-3 py-1.5 text-xs cursor-pointer';

    this.controlEl.appendChild(button);

    const controller = {
      setButtonText: (text: string) => {
        button.textContent = text;
        return controller;
      },
      setCta: () => {
        button.className = 'obsidian-btn obsidian-btn-primary px-3 py-1.5 text-xs cursor-pointer';
        return controller;
      },
      setWarning: () => {
        button.className = 'obsidian-btn obsidian-btn-danger px-3 py-1.5 text-xs cursor-pointer';
        return controller;
      },
      onClick: (cb: () => void) => {
        button.addEventListener('click', cb);
        return controller;
      },
      setDisabled: (disabled: boolean) => {
        button.disabled = disabled;
        return controller;
      },
    };

    callback(controller);
    return this;
  }

  public addText(
    callback: (text: {
      setValue: (val: string) => any;
      setPlaceholder: (placeholder: string) => any;
      onChange: (cb: (val: string) => void) => any;
      setDisabled: (disabled: boolean) => any;
    }) => void
  ): this {
    const input = document.createElement('input');
    input.type = 'text';
    input.className =
      'bg-[var(--flint-bg-input,#181818)] border border-[var(--flint-border-strong,#383838)] focus:border-[var(--flint-accent,#ea580c)] text-[var(--flint-text-primary,#ffffff)] text-xs rounded-[5px] px-3 py-1.5 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]';

    this.controlEl.appendChild(input);

    const controller = {
      setValue: (val: string) => {
        input.value = val;
        return controller;
      },
      setPlaceholder: (placeholder: string) => {
        input.placeholder = placeholder;
        return controller;
      },
      onChange: (cb: (val: string) => void) => {
        input.addEventListener('input', () => cb(input.value));
        return controller;
      },
      setDisabled: (disabled: boolean) => {
        input.disabled = disabled;
        return controller;
      },
    };

    callback(controller);
    return this;
  }

  public addDropdown(
    callback: (dropdown: {
      addOption: (value: string, label: string) => any;
      addOptions: (options: Record<string, string>) => any;
      setValue: (val: string) => any;
      onChange: (cb: (val: string) => void) => any;
      setDisabled: (disabled: boolean) => any;
    }) => void
  ): this {
    const select = document.createElement('select');
    select.className =
      'bg-[var(--flint-bg-input,#181818)] border border-[var(--flint-border-strong,#383838)] focus:border-[var(--flint-accent,#ea580c)] text-[var(--flint-text-secondary,#dcddde)] text-xs rounded-[5px] px-3 py-1.5 outline-none cursor-pointer';

    this.controlEl.appendChild(select);

    const controller = {
      addOption: (value: string, label: string) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        select.appendChild(opt);
        return controller;
      },
      addOptions: (options: Record<string, string>) => {
        Object.entries(options).forEach(([val, label]) => {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = label;
          select.appendChild(opt);
        });
        return controller;
      },
      setValue: (val: string) => {
        select.value = val;
        return controller;
      },
      onChange: (cb: (val: string) => void) => {
        select.addEventListener('change', () => cb(select.value));
        return controller;
      },
      setDisabled: (disabled: boolean) => {
        select.disabled = disabled;
        return controller;
      },
    };

    callback(controller);
    return this;
  }
}
