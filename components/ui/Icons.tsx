import { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

// Ícone de busca
export function SearchIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 20L16 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de filtro
export function FilterIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M3 4H21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 9H17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14H14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de menu (três pontos)
export function DotsMenuIcon({
  size = 24,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

// Ícone de grid (kanban)
export function GridIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.5 6H9.5C10.052 6 10.5 6.448 10.5 7V11C10.5 11.552 10.052 12 9.5 12H7.5C6.948 12 6.5 11.552 6.5 11V7C6.5 6.448 6.948 6 7.5 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.5 15H9.5C10.052 15 10.5 15.448 10.5 16V17C10.5 17.552 10.052 18 9.5 18H7.5C6.948 18 6.5 17.552 6.5 17V16C6.5 15.448 6.948 15 7.5 15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.5 18H14.5C13.948 18 13.5 17.552 13.5 17V13C13.5 12.448 13.948 12 14.5 12H16.5C17.052 12 17.5 12.448 17.5 13V17C17.5 17.552 17.052 18 16.5 18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.5 9H14.5C13.948 9 13.5 8.552 13.5 8V7C13.5 6.448 13.948 6 14.5 6H16.5C17.052 6 17.5 6.448 17.5 7V8C17.5 8.552 17.052 9 16.5 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 21H6C4.343 21 3 19.657 3 18V6C3 4.343 4.343 3 6 3H18C19.657 3 21 4.343 21 6V18C21 19.657 19.657 21 18 21Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de lista
export function ListIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M12 5H20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="6"
        cy="5"
        r="2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12H20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 19H20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="6"
        cy="12"
        r="2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="6"
        cy="19"
        r="2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de warning
export function WarningIcon({
  size = 18,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M0.823718 15C0.67094 15 0.532051 14.9618 0.407051 14.8854C0.282051 14.809 0.184829 14.7083 0.115385 14.5833C0.0459402 14.4583 0.00774573 14.3229 0.000801282 14.1771C-0.00614316 14.0312 0.0320513 13.8889 0.115385 13.75L7.82372 0.416667C7.90705 0.277778 8.01469 0.173611 8.14664 0.104167C8.27858 0.0347222 8.41399 0 8.55288 0C8.69177 0 8.82719 0.0347222 8.95913 0.104167C9.09108 0.173611 9.19872 0.277778 9.28205 0.416667L16.9904 13.75C17.0737 13.8889 17.1119 14.0312 17.105 14.1771C17.098 14.3229 17.0598 14.4583 16.9904 14.5833C16.9209 14.7083 16.8237 14.809 16.6987 14.8854C16.5737 14.9618 16.4348 15 16.2821 15H0.823718ZM8.55288 12.5C8.78899 12.5 8.98691 12.4201 9.14663 12.2604C9.30636 12.1007 9.38622 11.9028 9.38622 11.6667C9.38622 11.4306 9.30636 11.2326 9.14663 11.0729C8.98691 10.9132 8.78899 10.8333 8.55288 10.8333C8.31677 10.8333 8.11886 10.9132 7.95913 11.0729C7.79941 11.2326 7.71955 11.4306 7.71955 11.6667C7.71955 11.9028 7.79941 12.1007 7.95913 12.2604C8.11886 12.4201 8.31677 12.5 8.55288 12.5ZM8.55288 10C8.78899 10 8.98691 9.92014 9.14663 9.76042C9.30636 9.60069 9.38622 9.40278 9.38622 9.16667V6.66667C9.38622 6.43056 9.30636 6.23264 9.14663 6.07292C8.98691 5.91319 8.78899 5.83333 8.55288 5.83333C8.31677 5.83333 8.11886 5.91319 7.95913 6.07292C7.79941 6.23264 7.71955 6.43056 7.71955 6.66667V9.16667C7.71955 9.40278 7.79941 9.60069 7.95913 9.76042C8.11886 9.92014 8.31677 10 8.55288 10Z"
        fill="#E34935"
      />
    </svg>
  );
}

// Ícone de send
export function SendIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20C40 31.0457 31.0457 40 20 40C8.95431 40 0 31.0457 0 20Z"
        fill="#147471"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.9211 28.1792L26.9201 14.6942C27.2921 13.6892 26.3141 12.7112 25.3091 13.0832L11.8181 18.0862C10.6631 18.5142 10.7541 20.1762 11.9481 20.4762L18.0151 22.0002L19.5301 28.0482C19.8291 29.2432 21.4921 29.3352 21.9211 28.1792V28.1792Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de calendário
export function CalendarIcon({
  size = 16,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 9H21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 2V5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 2V5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Ícone de pessoa
export function PersonIcon({ size = 16, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Ícone de flag
export function FlagIcon({ size = 16, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M4 21V4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M4 4C4 4 5 3 8 3C11 3 13 5 16 5C19 5 20 4 20 4V14C20 14 19 15 16 15C13 15 11 13 8 13C5 13 4 14 4 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de view kanban
export function ViewKanbanIcon({
  size = 12,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect
        x="1"
        y="1"
        width="3"
        height="10"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="5"
        y="1"
        width="3"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="9"
        y="1"
        width="2"
        height="8"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

// Ícone de dashboard
export function DashboardIcon({
  size = 24,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19 21H5C3.895 21 3 20.105 3 19V5C3 3.895 3.895 3 5 3H19C20.105 3 21 3.895 21 5V19C21 20.105 20.105 21 19 21Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 12H8L10 8L14 16L16.158 12H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de usuário (pessoa)
export function UserIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M14.8171 4.16689C16.373 5.72274 16.373 8.24527 14.8171 9.80112C13.2613 11.357 10.7387 11.357 9.18287 9.80112C7.62702 8.24527 7.62702 5.72274 9.18287 4.16689C10.7387 2.61104 13.2613 2.61104 14.8171 4.16689"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 14.0081C16.554 14.0081 21 15.9751 21 19.0001V20.0001C21 20.5521 20.552 21.0001 20 21.0001H4C3.448 21.0001 3 20.5521 3 20.0001V19.0001C3 15.9741 7.446 14.0081 12 14.0081"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de usuários (colaboradores)
export function UsersIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M18 15V16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 20V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.4 16.5L16.3 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.7 19L20.6 19.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.4 19.5L16.3 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.7 17L20.6 16.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 16.6C20.2 17.4 20.2 18.6 19.4 19.4C18.6 20.2 17.4 20.2 16.6 19.4C15.8 18.6 15.8 17.4 16.6 16.6C17.4 15.8 18.6 15.8 19.4 16.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 5.2C16.7 6.9 16.7 9.6 15 11.2C13.3 12.8 10.6 12.9 9 11.2C7.4 9.5 7.3 6.8 9 5.2C10.7 3.6 13.3 3.6 15 5.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20C4 17.5 6 15.5 8.5 15.5H11.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de histórico (relógio)
export function ClockIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M6.375 12L4.125 14.25L1.875 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.125 12C4.125 12.694 4.211 13.366 4.36 14.015"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.125 12C22.125 7.029 18.096 3 13.125 3C8.154 3 4.125 7.029 4.125 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.125 21C18.096 21 22.125 16.971 22.125 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.754 17.155C7.381 19.478 10.073 21 13.125 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.496 14.871L12.844 12.698V7.98499"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Ícone de robô (smart-toy / IA)
export function SmartToyIcon({
  size = 22,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M3 13C2.16667 13 1.45833 12.7083 0.875 12.125C0.291667 11.5417 0 10.8333 0 10C0 9.16667 0.291667 8.45833 0.875 7.875C1.45833 7.29167 2.16667 7 3 7V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H8C8 2.16667 8.29167 1.45833 8.875 0.875C9.45833 0.291667 10.1667 0 11 0C11.8333 0 12.5417 0.291667 13.125 0.875C13.7083 1.45833 14 2.16667 14 3H17C17.55 3 18.0208 3.19583 18.4125 3.5875C18.8042 3.97917 19 4.45 19 5V7C19.8333 7 20.5417 7.29167 21.125 7.875C21.7083 8.45833 22 9.16667 22 10C22 10.8333 21.7083 11.5417 21.125 12.125C20.5417 12.7083 19.8333 13 19 13V17C19 17.55 18.8042 18.0208 18.4125 18.4125C18.0208 18.8042 17.55 19 17 19H5C4.45 19 3.97917 18.8042 3.5875 18.4125C3.19583 18.0208 3 17.55 3 17V13ZM8 11C8.41667 11 8.77083 10.8542 9.0625 10.5625C9.35417 10.2708 9.5 9.91667 9.5 9.5C9.5 9.08333 9.35417 8.72917 9.0625 8.4375C8.77083 8.14583 8.41667 8 8 8C7.58333 8 7.22917 8.14583 6.9375 8.4375C6.64583 8.72917 6.5 9.08333 6.5 9.5C6.5 9.91667 6.64583 10.2708 6.9375 10.5625C7.22917 10.8542 7.58333 11 8 11ZM14 11C14.4167 11 14.7708 10.8542 15.0625 10.5625C15.3542 10.2708 15.5 9.91667 15.5 9.5C15.5 9.08333 15.3542 8.72917 15.0625 8.4375C14.7708 8.14583 14.4167 8 14 8C13.5833 8 13.2292 8.14583 12.9375 8.4375C12.6458 8.72917 12.5 9.08333 12.5 9.5C12.5 9.91667 12.6458 10.2708 12.9375 10.5625C13.2292 10.8542 13.5833 11 14 11ZM8 15H14C14.2833 15 14.5208 14.9042 14.7125 14.7125C14.9042 14.5208 15 14.2833 15 14C15 13.7167 14.9042 13.4792 14.7125 13.2875C14.5208 13.0958 14.2833 13 14 13H8C7.71667 13 7.47917 13.0958 7.2875 13.2875C7.09583 13.4792 7 13.7167 7 14C7 14.2833 7.09583 14.5208 7.2875 14.7125C7.47917 14.9042 7.71667 15 8 15ZM5 17H17V5H5V17Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Ícone de configurações
export function SettingsIcon({
  size = 24,
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.9 15.647L5.298 15.861C6.33 16.019 7.067 16.943 6.991 17.984L6.888 19.395C6.858 19.806 7.082 20.193 7.453 20.372L8.487 20.87C8.858 21.049 9.301 20.982 9.604 20.703L10.643 19.743C11.409 19.035 12.591 19.035 13.358 19.743L14.397 20.703C14.7 20.983 15.142 21.049 15.514 20.87L16.55 20.371C16.92 20.193 17.143 19.807 17.113 19.397L17.01 17.984C16.934 16.943 17.671 16.019 18.703 15.861L20.101 15.647C20.508 15.585 20.836 15.28 20.928 14.878L21.183 13.76C21.275 13.358 21.112 12.941 20.772 12.709L19.605 11.91C18.744 11.32 18.481 10.168 19.001 9.26302L19.706 8.03702C19.911 7.68002 19.877 7.23302 19.62 6.91102L18.905 6.01402C18.648 5.69202 18.22 5.55902 17.826 5.68002L16.474 6.09402C15.475 6.40002 14.41 5.88702 14.026 4.91602L13.508 3.60302C13.356 3.21902 12.985 2.96702 12.572 2.96802L11.426 2.97102C11.013 2.97202 10.643 3.22602 10.493 3.61102L9.988 4.90902C9.608 5.88602 8.538 6.40302 7.536 6.09502L6.128 5.66302C5.733 5.54102 5.303 5.67502 5.046 5.99902L4.336 6.89702C4.079 7.22202 4.048 7.67002 4.257 8.02702L4.978 9.25602C5.509 10.162 5.249 11.325 4.383 11.918L3.23 12.708C2.89 12.941 2.727 13.358 2.819 13.759L3.074 14.877C3.165 15.28 3.493 15.585 3.9 15.647V15.647Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.916 10.084C14.974 11.142 14.974 12.858 13.916 13.916C12.858 14.974 11.142 14.974 10.084 13.916C9.026 12.858 9.026 11.142 10.084 10.084C11.142 9.02603 12.858 9.02603 13.916 10.084"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
