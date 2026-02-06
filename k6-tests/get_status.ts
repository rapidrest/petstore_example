import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '30s',
  url: 'http://localhost:3000'
};

export default function() {
  const res = http.get(options.url + "/status");
  check(res, { "status is 200": (res) => res.status === 200 });
}
