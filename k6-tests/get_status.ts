import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '60s'
};

export const config = {
  url: __ENV.url || 'http://localhost:3000'
};

export default function() {
  const res = http.get(config.url + "/status");
  check(res, { "status is 200": (res) => res.status === 200 });
}
