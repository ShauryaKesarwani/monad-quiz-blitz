---
name: backend-route-summary
description: Automatically generate and maintain BACKEND_ROUTE_SUMMARY.md for frontend developers.
---

# Skill: Backend Route Summary Generator

## Purpose

Continuously generate and maintain:

/BACKEND_ROUTE_SUMMARY.md

This file provides frontend developers a clear overview of:

- All backend routes
- HTTP methods
- Expected request body
- Query parameters
- Response format
- Auth requirements
- Error responses

Backend stack:
- Bun
- Hono

---

## Responsibilities

### 1. Detect Routes

Parse all backend route definitions inside Bun + Hono files.

Extract:

- Route path
- HTTP method
- Middleware usage
- Auth requirement (if any)
- Validation schema (if defined)
- Response structure
- Status codes

---

### 2. Generate Structured Summary

BACKEND_ROUTE_SUMMARY.md must contain:

# Backend Route Summary

## Base URL

## Auth Overview

## Routes

For each route:

### METHOD /route/path

Description  
Auth Required: Yes/No  
Request Body:
```json
{
}