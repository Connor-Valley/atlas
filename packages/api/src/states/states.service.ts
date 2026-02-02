import { SUPPORTED_STATES } from './states.types.js';

export function getStates() {
    return SUPPORTED_STATES.map(state => ({
        code: state,
        name: getStateName(state)
    }));
}

function getStateName(code: string): string {
    const stateNames: Record<string, string> = {
        MI: 'Michigan',
        CA: 'California',
        WA: 'Washington',
        CO: 'Colorado',
        AZ: 'Arizona',
    };
    return stateNames[code] || code;
}