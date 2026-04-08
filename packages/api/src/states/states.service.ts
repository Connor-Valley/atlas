import {STATE_FIPS, SUPPORTED_STATES, SupportedState} from './states.types.js';
import { getListedPlacesForState } from "../places/place-resolver.js";

export function getStates() {
    return SUPPORTED_STATES.map(state => ({
        code: state,
        name: getStateName(state)
    }));
}

function getStateName(code: string): string {
    const stateNames: Record<string, string> = {
        AL: 'Alabama',
        AK: 'Alaska',
        AZ: 'Arizona',
        AR: 'Arkansas',
        CA: 'California',
        CO: 'Colorado',
        CT: 'Connecticut',
        DE: 'Delaware',
        DC: 'Washington DC',
        FL: 'Florida',
        GA: 'Georgia',
        HI: 'Hawaii',
        ID: 'Idaho',
        IL: 'Illinois',
        IN: 'Indiana',
        IA: 'Iowa',
        KS: 'Kansas',
        KY: 'Kentucky',
        LA: 'Louisiana',
        ME: 'Maine',
        MD: 'Maryland',
        MA: 'Massachusetts',
        MI: 'Michigan',
        MN: 'Minnesota',
        MS: 'Mississippi',
        MO: 'Missouri',
        MT: 'Montana',
        NE: 'Nebraska',
        NV: 'Nevada',
        NH: 'New Hampshire',
        NJ: 'New Jersey',
        NM: 'New Mexico',
        NY: 'New York',
        NC: 'North Carolina',
        ND: 'North Dakota',
        OH: 'Ohio',
        OK: 'Oklahoma',
        OR: 'Oregon',
        PA: 'Pennsylvania',
        RI: 'Rhode Island',
        SC: 'South Carolina',
        SD: 'South Dakota',
        TN: 'Tennessee',
        TX: 'Texas',
        UT: 'Utah',
        VT: 'Vermont',
        VA: 'Virginia',
        WA: 'Washington',
        WV: 'West Virginia',
        WI: 'Wisconsin',
        WY: 'Wyoming',
    };
    return stateNames[code] || code;
}

export async function getCitiesForState(
    state: string,
    year: number = 2024
): Promise<{ name: string; slug: string }[]> {
    const stateCode = state.toUpperCase() as SupportedState;
    const stateFips = STATE_FIPS[stateCode];

    if (!stateFips) {
        throw new Error(`Unsupported state: ${stateCode}`);
    }

    return getListedPlacesForState(stateCode, year);
}
