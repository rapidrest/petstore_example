import encoding from 'k6/encoding';
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '30s'
};

export const config = {
  url: __ENV.url || 'http://localhost:3000',
  username: __ENV.username || "test_user",
  password: __ENV.password || "password"
};

export function login(url: string, username: string, password: string) {
  const headers = {
    'Content-Type': "application/json",
    'Authorization': `basic ${encoding.b64encode(`${username}:${password}`)}`
  };
  const res = http.get(url + "/user/login", { headers });
  check(res, { "status is 2XX": (res) => res.status >= 200 && res.status < 300 });
  check(res, { "res.body is defined": (res) => res.body !== undefined });
  if (res && res.body) {
    const payload: any = JSON.parse(res.body.toString());
    return payload.token;
  } else {
    throw new Error("Failed to login.");
  }
}

export default function() {
  login(config.url, config.username + Math.ceil(Math.random() * 10), config.password);
}
