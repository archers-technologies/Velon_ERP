export declare const COUNTRY_CATALOG: readonly [{
    readonly code: "AF";
    readonly label: "Afghanistan";
    readonly currency: "AFN";
}, {
    readonly code: "BH";
    readonly label: "Bahrain";
    readonly currency: "BHD";
}, {
    readonly code: "IN";
    readonly label: "India";
    readonly currency: "INR";
}, {
    readonly code: "OM";
    readonly label: "Oman";
    readonly currency: "OMR";
}, {
    readonly code: "QA";
    readonly label: "Qatar";
    readonly currency: "QAR";
}, {
    readonly code: "SA";
    readonly label: "Saudi Arabia";
    readonly currency: "SAR";
}, {
    readonly code: "AE";
    readonly label: "United Arab Emirates";
    readonly currency: "AED";
}, {
    readonly code: "KW";
    readonly label: "Kuwait";
    readonly currency: "KWD";
}, {
    readonly code: "US";
    readonly label: "United States";
    readonly currency: "USD";
}, {
    readonly code: "GB";
    readonly label: "United Kingdom";
    readonly currency: "GBP";
}, {
    readonly code: "DE";
    readonly label: "Germany";
    readonly currency: "EUR";
}, {
    readonly code: "FR";
    readonly label: "France";
    readonly currency: "EUR";
}, {
    readonly code: "SG";
    readonly label: "Singapore";
    readonly currency: "SGD";
}, {
    readonly code: "AU";
    readonly label: "Australia";
    readonly currency: "AUD";
}, {
    readonly code: "CA";
    readonly label: "Canada";
    readonly currency: "CAD";
}, {
    readonly code: "JP";
    readonly label: "Japan";
    readonly currency: "JPY";
}, {
    readonly code: "CN";
    readonly label: "China";
    readonly currency: "CNY";
}, {
    readonly code: "PK";
    readonly label: "Pakistan";
    readonly currency: "PKR";
}, {
    readonly code: "BD";
    readonly label: "Bangladesh";
    readonly currency: "BDT";
}, {
    readonly code: "NP";
    readonly label: "Nepal";
    readonly currency: "NPR";
}, {
    readonly code: "LK";
    readonly label: "Sri Lanka";
    readonly currency: "LKR";
}, {
    readonly code: "MY";
    readonly label: "Malaysia";
    readonly currency: "MYR";
}, {
    readonly code: "TH";
    readonly label: "Thailand";
    readonly currency: "THB";
}, {
    readonly code: "ID";
    readonly label: "Indonesia";
    readonly currency: "IDR";
}, {
    readonly code: "PH";
    readonly label: "Philippines";
    readonly currency: "PHP";
}, {
    readonly code: "EG";
    readonly label: "Egypt";
    readonly currency: "EGP";
}, {
    readonly code: "ZA";
    readonly label: "South Africa";
    readonly currency: "ZAR";
}, {
    readonly code: "NG";
    readonly label: "Nigeria";
    readonly currency: "NGN";
}, {
    readonly code: "BR";
    readonly label: "Brazil";
    readonly currency: "BRL";
}, {
    readonly code: "MX";
    readonly label: "Mexico";
    readonly currency: "MXN";
}, {
    readonly code: "OTHER";
    readonly label: "Other / not listed";
    readonly currency: "USD";
}];
export type CountryCode = (typeof COUNTRY_CATALOG)[number]['code'];
export declare const CURRENCY_SYMBOLS: Record<string, string>;
export declare const TIMEZONE_OPTIONS: readonly [{
    readonly value: "Asia/Kolkata";
    readonly label: "Asia/Kolkata (IST)";
}, {
    readonly value: "Asia/Dubai";
    readonly label: "Asia/Dubai (GST)";
}, {
    readonly value: "Asia/Riyadh";
    readonly label: "Asia/Riyadh (AST)";
}, {
    readonly value: "Asia/Muscat";
    readonly label: "Asia/Muscat (GST)";
}, {
    readonly value: "Asia/Qatar";
    readonly label: "Asia/Qatar (AST)";
}, {
    readonly value: "Asia/Kuwait";
    readonly label: "Asia/Kuwait (AST)";
}, {
    readonly value: "Asia/Bahrain";
    readonly label: "Asia/Bahrain (AST)";
}, {
    readonly value: "Asia/Singapore";
    readonly label: "Asia/Singapore (SGT)";
}, {
    readonly value: "Europe/London";
    readonly label: "Europe/London (GMT/BST)";
}, {
    readonly value: "Europe/Berlin";
    readonly label: "Europe/Berlin (CET)";
}, {
    readonly value: "America/New_York";
    readonly label: "America/New_York (EST)";
}, {
    readonly value: "America/Los_Angeles";
    readonly label: "America/Los_Angeles (PST)";
}, {
    readonly value: "UTC";
    readonly label: "UTC";
}];
export declare const DATE_FORMAT_OPTIONS: readonly [{
    readonly value: "DD/MM/YYYY";
    readonly label: "DD/MM/YYYY";
}, {
    readonly value: "MM/DD/YYYY";
    readonly label: "MM/DD/YYYY";
}, {
    readonly value: "YYYY-MM-DD";
    readonly label: "YYYY-MM-DD";
}];
export declare const NUMBER_FORMAT_OPTIONS: readonly [{
    readonly value: "en-IN";
    readonly label: "India (1,23,456.78)";
}, {
    readonly value: "en-US";
    readonly label: "US (1,234,567.89)";
}, {
    readonly value: "en-GB";
    readonly label: "UK (1,234,567.89)";
}, {
    readonly value: "ar-SA";
    readonly label: "Arabic (Saudi)";
}, {
    readonly value: "de-DE";
    readonly label: "German (1.234.567,89)";
}];
export declare function getCountryByCode(code: string): {
    readonly code: "AF";
    readonly label: "Afghanistan";
    readonly currency: "AFN";
} | {
    readonly code: "BH";
    readonly label: "Bahrain";
    readonly currency: "BHD";
} | {
    readonly code: "IN";
    readonly label: "India";
    readonly currency: "INR";
} | {
    readonly code: "OM";
    readonly label: "Oman";
    readonly currency: "OMR";
} | {
    readonly code: "QA";
    readonly label: "Qatar";
    readonly currency: "QAR";
} | {
    readonly code: "SA";
    readonly label: "Saudi Arabia";
    readonly currency: "SAR";
} | {
    readonly code: "AE";
    readonly label: "United Arab Emirates";
    readonly currency: "AED";
} | {
    readonly code: "KW";
    readonly label: "Kuwait";
    readonly currency: "KWD";
} | {
    readonly code: "US";
    readonly label: "United States";
    readonly currency: "USD";
} | {
    readonly code: "GB";
    readonly label: "United Kingdom";
    readonly currency: "GBP";
} | {
    readonly code: "DE";
    readonly label: "Germany";
    readonly currency: "EUR";
} | {
    readonly code: "FR";
    readonly label: "France";
    readonly currency: "EUR";
} | {
    readonly code: "SG";
    readonly label: "Singapore";
    readonly currency: "SGD";
} | {
    readonly code: "AU";
    readonly label: "Australia";
    readonly currency: "AUD";
} | {
    readonly code: "CA";
    readonly label: "Canada";
    readonly currency: "CAD";
} | {
    readonly code: "JP";
    readonly label: "Japan";
    readonly currency: "JPY";
} | {
    readonly code: "CN";
    readonly label: "China";
    readonly currency: "CNY";
} | {
    readonly code: "PK";
    readonly label: "Pakistan";
    readonly currency: "PKR";
} | {
    readonly code: "BD";
    readonly label: "Bangladesh";
    readonly currency: "BDT";
} | {
    readonly code: "NP";
    readonly label: "Nepal";
    readonly currency: "NPR";
} | {
    readonly code: "LK";
    readonly label: "Sri Lanka";
    readonly currency: "LKR";
} | {
    readonly code: "MY";
    readonly label: "Malaysia";
    readonly currency: "MYR";
} | {
    readonly code: "TH";
    readonly label: "Thailand";
    readonly currency: "THB";
} | {
    readonly code: "ID";
    readonly label: "Indonesia";
    readonly currency: "IDR";
} | {
    readonly code: "PH";
    readonly label: "Philippines";
    readonly currency: "PHP";
} | {
    readonly code: "EG";
    readonly label: "Egypt";
    readonly currency: "EGP";
} | {
    readonly code: "ZA";
    readonly label: "South Africa";
    readonly currency: "ZAR";
} | {
    readonly code: "NG";
    readonly label: "Nigeria";
    readonly currency: "NGN";
} | {
    readonly code: "BR";
    readonly label: "Brazil";
    readonly currency: "BRL";
} | {
    readonly code: "MX";
    readonly label: "Mexico";
    readonly currency: "MXN";
} | {
    readonly code: "OTHER";
    readonly label: "Other / not listed";
    readonly currency: "USD";
} | undefined;
export declare function getCountryDefaultCurrency(code: string): string;
export declare function getCurrencySymbol(currencyCode: string): string;
export declare function formatCurrencyLabel(currencyCode: string): string;
export declare function defaultTimezoneForCountry(code: string): string;
export declare function defaultDateFormatForCountry(code: string): string;
export declare function defaultNumberFormatForCountry(code: string): string;
export type WorkspaceMoneyFormat = {
    currencyCode: string;
    currencySymbol?: string | null;
    numberFormat?: string | null;
};
export declare function formatWorkspaceMoney(amount: number, format: WorkspaceMoneyFormat): string;
export declare function isKnownCountryCode(code: string): boolean;
export declare function isKnownCurrencyCode(code: string): boolean;
