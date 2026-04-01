import {STATE_FIPS, SUPPORTED_STATES, SupportedState} from './states.types.js';

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
        DC: 'District of Columbia',
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
    year: number = 2023
): Promise<{ name: string; slug: string }[]> {
    const stateCode = state.toUpperCase() as SupportedState;
    const stateFips = STATE_FIPS[stateCode];

    if (!stateFips) {
        throw new Error(`Unsupported state: ${stateCode}`);
    }

    const response = await fetch(
        `https://api.census.gov/data/${year}/acs/acs5` +
        `?get=NAME&for=place:*&in=state:${stateFips}` +
        (process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : "")
    )

    if (!response.ok) {
        throw new Error(`Unable to get cities for state: ${stateCode}`);
    }

    const data = (await response.json()) as string[][];
    const [, ...rows] = data;

    return rows
        .filter(row => row[0].includes(' city'))
        .map(row => {
            const fullName = row[0];
            const cityName = fullName.split(',')[0].replace(/ city$/i, '');
            const slug = cityName.toLowerCase().replace(/\s+/g, '-');
            return { name: cityName, slug };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}