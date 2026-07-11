import encoding from 'k6/encoding';
import http from 'k6/http';
import { check } from 'k6';
import { createPet } from './create_pet.ts';
import { createUser } from './create_user.ts';
import { login, config as loginConfig } from './login.ts';

export const options = {
  vus: 1,
};

export const config = {
  url: __ENV.url || 'http://localhost:3000/api'
};

export default function() {
  // Create admin account
  const admin = createUser(config.url, { name: "admin", password: "admin", roles: ["admin"] });
  if (admin) {
    console.log("Created user: " + (admin.name ? admin.name : admin));
  }

  // Login with admin account
  const adminToken = login(config.url, "admin", "admin");
  if (adminToken) {
    console.log("Logged in to admin user");
    console.log("AuthToken="+adminToken);
  }

  // Create snowball pet
  const pet = createPet(config.url, adminToken, {
    name: "snowball",
    category: { name: "bunny" },
    tags: ["cute","fluffy","smart","white"]
  });
  if (pet) {
    console.log("Created pet: " + (pet.name ? pet.name : pet));
  }

  // Create default test users
  for (let i = 0; i < 101; i++) {
    const user = createUser(config.url, {
        name: loginConfig.name + i
    })
    if (user) {
        console.log("Created test user: " + (user.name ? user.name : user));
    }
  }

  console.log("Setup complete.");
}
