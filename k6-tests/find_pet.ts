import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 200,
  duration: '300s'
};

export const config = {
  url: __ENV.url || 'http://localhost:3000',
  id: __ENV.category || "bunny"
};

export function findPets(url: string, category: string) {
  const res = http.get(url + "/pet?category=" + category);
  check(res, { "status is 200": (res) => res.status === 200 });
  check(res, { "res.body is defined": (res) => res.body !== undefined });
  if (res && res.body) {
    return JSON.parse(res.body.toString());
  } else {
    throw new Error("Failed to retrieve pets with category: " + category);
  }
}

export default function() {
  findPets(config.url, config.id);
}
