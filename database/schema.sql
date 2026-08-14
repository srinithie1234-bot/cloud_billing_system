-- Integrated Cloud Cost Optimization System — Database Schema
-- SQLite-equivalent schema (implemented here as in-browser Postgres via PGlite).
-- This file documents the schema for the Flask + SQLite reference implementation.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  planned_budget REAL NOT NULL,
  actual_budget REAL NOT NULL
);

CREATE TABLE cloud_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_name TEXT NOT NULL,
  monthly_cost REAL NOT NULL
);

CREATE TABLE services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  planned_cost REAL NOT NULL,
  actual_cost REAL NOT NULL
);

CREATE TABLE governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_name TEXT NOT NULL,
  threshold REAL NOT NULL,
  current_usage REAL NOT NULL
);

CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_date TEXT NOT NULL
);

CREATE TABLE recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recommendation TEXT NOT NULL,
  created_date TEXT NOT NULL
);
