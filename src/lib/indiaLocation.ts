import { City, State } from "country-state-city";

const INDIA_CODE = "IN";

export const getIndiaStates = () =>
  State.getStatesOfCountry(INDIA_CODE)
    .map((s) => ({ name: s.name, code: s.isoCode }))
    .sort((a, b) => a.name.localeCompare(b.name));

export const getIndiaDistricts = (stateCode: string) =>
  City.getCitiesOfState(INDIA_CODE, stateCode)
    .map((c) => c.name)
    .filter((name, index, arr) => arr.indexOf(name) === index)
    .sort((a, b) => a.localeCompare(b));

// Block-level official pan-India dataset is not uniformly available.
// We reuse locality-level names as practical "block" options for now.
export const getIndiaBlocks = (stateCode: string) =>
  City.getCitiesOfState(INDIA_CODE, stateCode)
    .map((c) => c.name)
    .filter((name, index, arr) => arr.indexOf(name) === index)
    .sort((a, b) => a.localeCompare(b));
