/*
 * Created by Jimmy Lan
 * Creation Date: 2021-03-15
 */

import request from "supertest";
import mongoose from "mongoose";

import { app } from "../../src/app";
import { PasswordEncoder } from "../../src/services";
import { UserRole } from "../../src/types";
import { connectMongo, setEnvVariables, tearDownMongo } from "../common";

const apiLink = (uri: string) => `/api/v1/users${uri}`;

jest.mock("../../src/services/redisClient");
jest.mock("../../src/services/rateLimiters");

describe("sign in api", () => {
  const sampleUser = {
    email: "user@thepolyteam.com",
    password: "password",
    clientSecret: PasswordEncoder.randomString(20),
    role: UserRole.member,
  };

  beforeAll(async () => {
    setEnvVariables();
    await connectMongo();

    // Setup sample user
    const { email, password, clientSecret, role } = sampleUser;
    const sampleUserEntry = {
      email,
      password: await PasswordEncoder.toHash(password),
      clientSecret,
      role,
    };

    console.log(sampleUserEntry);

    // Insert to document
    const userCollection = mongoose.connection.collection("users");
    await userCollection.insertOne(sampleUserEntry, {});
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await tearDownMongo();
  });

  it("responds with 400 when the request contains invalid fields.", async () => {
    let response;

    response = await request(app).post(apiLink("/signin")).send({}).expect(400);

    expect(response.body.success).toBeDefined();
    expect(response.body.success).toBeFalsy();

    response = await request(app)
      .post(apiLink("/signin"))
      .send({ email: "user@test.dev" })
      .expect(400);

    expect(response.body.success).toBeDefined();
    expect(response.body.success).toBeFalsy();

    response = await request(app)
      .post(apiLink("/signin"))
      .send({ email: "random-string-that-is-not-email", password: "password" })
      .expect(400);

    expect(response.body.success).toBeDefined();
    expect(response.body.success).toBeFalsy();
  });

  it("responds with 401 when invalid email or password is provided", async () => {
    let response;

    response = await request(app)
      .post(apiLink("/signin"))
      .send({ email: sampleUser.email, password: "jafjewoi" })
      .expect(401);

    expect(response.body.success).toBeDefined();
    expect(response.body.success).toBeFalsy();

    response = await request(app)
      .post(apiLink("/signin"))
      .send({
        email: "doesnotexist@example.com",
        password: sampleUser.password,
      })
      .expect(401);

    expect(response.body.success).toBeDefined();
    expect(response.body.success).toBeFalsy();
  });
});
