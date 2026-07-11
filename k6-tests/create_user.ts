import http from 'k6/http';
import { check } from 'k6';
import { uuidv4 } from './uuid.ts';

export const options = {
  vus: 200,
  duration: '60s',
};

export const config = {
  url: __ENV.url || 'http://localhost:3000/api'
};

export function createUser(url: string, data?: any) {
  const headers = {
    'Content-Type': "application/json"
  };
  const uid = uuidv4();
  let user = {
    name: uid,
    password: "password",
    firstName: "Test",
    lastName: "k6",
    email: `${uid}@rapidrest.dev`,
    phone: "8188675309",
    ...data
  };
  const res = http.post(url + "/user", JSON.stringify(user), { headers });
  check(res, { "status is 2XX": (res) => res.status >= 200 && res.status < 300 });
  return res.body;
}

export default function() {
  createUser(config.url);
}
