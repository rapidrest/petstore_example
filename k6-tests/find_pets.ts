import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 200,
  duration: '60s'
};

export const config = {
  url: __ENV.url || 'http://localhost:3000/api'
};

export function findPets(url: string) {
  const page = Math.floor(Math.random() * 10);
  const res = http.get(url + "/pet?page=" + page);
  check(res, { "status is 200": (res) => res.status === 200 });
  check(res, { "res.body is defined": (res) => res.body !== undefined });
  if (res && res.body) {
    return JSON.parse(res.body.toString());
  } else {
    throw new Error("Failed to retrieve pets with page: " + page);
  }
}

export default function() {
  findPets(config.url);
}
