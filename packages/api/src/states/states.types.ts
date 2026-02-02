export const STATE_FIPS: Record<string, string> = {
    MI: '26',
    CA: '06',
    WA: '53',
    CO: '08',
    AZ: '04',
};

export const SUPPORTED_STATES = ['MI', 'CA', 'WA', 'CO', 'AZ'] as const;

export type SupportedState = typeof SUPPORTED_STATES[number];