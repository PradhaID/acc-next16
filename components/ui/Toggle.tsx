"use client";

import React, { useId, useEffect, useRef } from "react";

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  indeterminate?: boolean;
}

export default function Toggle({
  label,
  id,
  checked,
  onChange,
  indeterminate = false,
  className = "",
  disabled,
  ...props
}: ToggleProps) {
  const generatedId = useId();
  const actualId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className={`inline-flex items-center gap-3 ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}>
      <div className="checkbox-wrapper-51 shrink-0">
        <input
          ref={inputRef}
          type="checkbox"
          id={actualId}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
        <label htmlFor={actualId} className="toggle">
          <span>
            <svg width="10px" height="10px" viewBox="0 0 10 10">
              <path d="M5,1 L5,1 C2.790861,1 1,2.790861 1,5 L1,5 C1,7.209139 2.790861,9 5,9 L5,9 C7.209139,9 9,7.209139 9,5 L9,5 C9,2.790861 7.209139,1 5,1 L5,9 L5,1 Z"></path>
            </svg>
          </span>
        </label>
      </div>
      {label && (
        <label htmlFor={actualId} className="text-sm font-semibold text-stone-700 dark:text-stone-300 cursor-pointer select-none">
          {label}
        </label>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .checkbox-wrapper-51 input[type="checkbox"] {
          visibility: hidden;
          display: none;
        }

        .checkbox-wrapper-51 .toggle {
          position: relative;
          display: block;
          width: 42px;
          height: 24px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transform: translate3d(0, 0, 0);
        }
        
        .checkbox-wrapper-51 .toggle:before {
          content: "";
          position: relative;
          top: 1px;
          left: 1px;
          width: 40px;
          height: 22px;
          display: block;
          background: #d6d3d1; /* stone-300 */
          border-radius: 12px;
          transition: background 0.2s ease;
        }
        
        .dark .checkbox-wrapper-51 .toggle:before {
          background: #44403c; /* stone-700 */
        }

        .checkbox-wrapper-51 .toggle span {
          position: absolute;
          top: 0;
          left: 0;
          width: 24px;
          height: 24px;
          display: block;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }

        .dark .checkbox-wrapper-51 .toggle span {
          background: #f5f5f4; /* stone-100 */
        }

        .checkbox-wrapper-51 .toggle span svg {
          margin: 7px;
          fill: none;
        }

        .checkbox-wrapper-51 .toggle span svg path {
          stroke: #d6d3d1;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 24;
          stroke-dashoffset: 0;
          transition: all 0.5s linear;
        }
        
        .dark .checkbox-wrapper-51 .toggle span svg path {
          stroke: #44403c;
        }

        /* Checked state */
        .checkbox-wrapper-51 input[type="checkbox"]:checked + .toggle:before {
          background: #ea580c; /* emerald-600 */
        }

        .checkbox-wrapper-51 input[type="checkbox"]:checked + .toggle span {
          transform: translateX(18px);
        }

        .checkbox-wrapper-51 input[type="checkbox"]:checked + .toggle span path {
          stroke: #ea580c; /* emerald-600 */
          stroke-dasharray: 25;
          stroke-dashoffset: 25;
        }

        /* Indeterminate state */
        .checkbox-wrapper-51 input[type="checkbox"]:indeterminate + .toggle:before {
          background: #f59e0b; /* emerald-500 */
        }

        .checkbox-wrapper-51 input[type="checkbox"]:indeterminate + .toggle span {
          transform: translateX(9px);
        }

        .checkbox-wrapper-51 input[type="checkbox"]:indeterminate + .toggle span path {
          stroke: #f59e0b; /* emerald-500 */
          stroke-dasharray: 24;
          stroke-dashoffset: 12;
        }
      `}} />
    </div>
  );
}
