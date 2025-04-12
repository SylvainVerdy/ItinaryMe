
import * as React from "react";
export function CustomIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20M17 5H9.5a2.5 2.5 0 0 0 0 5h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function WorldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.9 15.9 0 0 1 4 12 15.9 15.9 0 0 1-4 12 15.9 15.9 0 0 1-4-12 15.9 15.9 0 0 1 4-12z" />
    </svg>
  );
}

export function ItinaryMeLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      width="70"
      height="24"
      viewBox="0 0 70 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.5 0C14.9173 0 18.5 3.58268 18.5 8C18.5 12.4173 14.9173 16 10.5 16C6.08272 16 2.5 12.4173 2.5 8C2.5 3.58268 6.08272 0 10.5 0ZM10.5 2C7.19424 2 4.5 4.69424 4.5 8C4.5 11.3058 7.19424 14 10.5 14C13.8058 14 16.5 11.3058 16.5 8C16.5 4.69424 13.8058 2 10.5 2Z"
        fill="#2463EB"
      />
      <path
        d="M67.5368 8.67578C67.8218 8.15083 67.7082 7.49039 67.1833 7.20537C66.6583 6.92036 66.0004 7.03397 65.7154 7.55893L57.4896 22.441C57.2046 22.966 57.3182 23.6265 57.8431 23.9115C58.3681 24.1965 59.026 24.0829 59.311 23.5579L67.5368 8.67578Z"
        fill="#2463EB"
      />
      <path
        d="M55.225 0.463867C55.51 0.463867 55.7495 0.703426 55.7495 0.988426V15.0115C55.7495 15.2965 55.51 15.5361 55.225 15.5361H53.2749C52.9899 15.5361 52.7495 15.2965 52.7495 15.0115V0.988426C52.7495 0.703426 52.9899 0.463867 53.2749 0.463867H55.225Z"
        fill="#2463EB"
      />
      <path d="M27.25 8H42.75" stroke="#2463EB" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function USFlagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id="mask0_103_1008" style={{ maskUnits: "userSpaceOnUse" }} x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#C4C4C4" />
      </mask>
      <g mask="url(#mask0_103_1008)">
        <path d="M0 0H24V24H0V0Z" fill="#B31942" />
        <path d="M0 0H24V12H0V0Z" fill="white" />
        <path d="M0 0H10V10H0V0Z" fill="#3C3B6E" />
        <path d="M1.5 1C1.77614 1 2 0.776142 2 0.5C2 0.223858 1.77614 0 1.5 0C1.22386 0 1 0.223858 1 0.5C1 0.776142 1.22386 1 1.5 1Z" fill="white" />
        <path d="M3.5 1C3.77614 1 4 0.776142 4 0.5C4 0.223858 3.77614 0 3.5 0C3.22386 0 3 0.223858 3 0.5C3 0.776142 3.22386 1 3.5 1Z" fill="white" />
        <path d="M6.5 1C6.77614 1 7 0.776142 7 0.5C7 0.223858 6.77614 0 6.5 0C6.22386 0 6 0.223858 6 0.5C6 0.776142 6.22386 1 6.5 1Z" fill="white" />
        <path d="M8.5 1C8.77614 1 9 0.776142 9 0.5C9 0.223858 8.77614 0 8.5 0C8.22386 0 8 0.223858 8 0.5C8 0.776142 8.22386 1 8.5 1Z" fill="white" />
        <path d="M4.5 3C4.77614 3 5 2.77614 5 2.5C5 2.22386 4.77614 2 4.5 2C4.22386 2 4 2.22386 4 2.5C4 2.77614 4.22386 3 4.5 3Z" fill="white" />
        <path d="M2.5 3C2.77614 3 3 2.77614 3 2.5C3 2.22386 2.77614 2 2.5 2C2.22386 2 2 2.22386 2 2.5C2 2.77614 2.22386 3 2.5 3Z" fill="white" />
        <path d="M8.5 3C8.77614 3 9 2.77614 9 2.5C9 2.22386 8.77614 2 8.5 2C8.22386 2 8 2.22386 8 2.5C8 2.77614 8.22386 3 8.5 3Z" fill="white" />
      </g>
    </svg>
  );
}

export function ExpertIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 12 2.5 7.5L12 21l6.5-1.5L21 12l-2-6-5.5 1-3-8-3 8-5.5-1z" />
    </svg>
  );
}

export function SeamlessIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 2 4 9m-4-9-4 9m8 4H4v7h16v-7z" />
    </svg>
  );
}

export function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    ><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  );
}

export const FrenchFlagIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id="mask0_103_836" style={{ maskUnits: "userSpaceOnUse" }} x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#C4C4C4" />
      </mask>
      <g mask="url(#mask0_103_836)">
        <path d="M0 0H24V24H0V0Z" fill="white" />
        <path d="M0 0H8V24H0V0Z" fill="#002654" />
        <path d="M16 0H24V24H16V0Z" fill="#CE1126" />
      </g>
    </svg>
  );
}

export const EnglishFlagIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id="mask0_103_836" style={{ maskUnits: "userSpaceOnUse" }} x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#C4C4C4" />
      </mask>
      <g mask="url(#mask0_103_836)">
        <path d="M0 0H24V24H0V0Z" fill="white" />
        <path d="M0 0H8V24H0V0Z" fill="#002654" />
        <path d="M16 0H24V24H16V0Z" fill="#CE1126" />
      </g>
    </svg>
  );
}

export const UKFlagIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 640 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id="mask0_103_1008" style={{ maskUnits: "userSpaceOnUse" }} x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#C4C4C4" />
      </mask>
      <g mask="url(#mask0_103_1008)">
        <path fill="#002473" d="M0 0H640V480H0z"/>
        <path fill="#fff" d="M0 0L266.7 199.95M640 0L373.3 199.95M0 480L266.7 280.05M640 480L373.3 280.05" stroke="#fff" strokeWidth="96"/>
        <path d="M160 0H0V480H160M640 0H480V480H640M0 224H640M0 256H640" stroke="#fff" strokeWidth="64"/>
        <path fill="#C8102E" d="M0 0L320 240M640 0L320 240M0 480L320 240M640 480L320 240" stroke="#C8102E" strokeWidth="32"/>
        <path d="M160 0H0V480H160M640 0H480V480H640M0 224H640M0 256H640" stroke="#C8102E" strokeWidth="32"/>
      </g>
    </svg>
  );
}

export const USAFlagIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id="mask0_103_836" style={{ maskUnits: "userSpaceOnUse" }} x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#C4C4C4" />
      </mask>
      <g mask="url(#mask0_103_836)">
        <path d="M0 0H24V24H0V0Z" fill="white" />
        <path d="M0 0H8V24H0V0Z" fill="#002654" />
        <path d="M16 0H24V24H16V0Z" fill="#CE1126" />
      </g>
    </svg>
  );
}
