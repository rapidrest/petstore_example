import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '30s',
  url: 'http://localhost:3000',
  id: "snowball"
};

export function getPet(url: string, id: string) {
  const res = http.get(url + "/pet/" + id);
  check(res, { "status is 200": (res) => res.status === 200 });
  check(res, { "res.body is defined": (res) => res.body !== undefined });
  if (res && res.body) {
    return JSON.parse(res.body.toString());
  } else {
    throw new Error("Failed to retrieve pet with id: " + id);
  }
}

export default function() {
  getPet(options.url, options.id);
}
