-- Migration: 20260422120000_extensions_and_types
-- Phase 2. Extensions + shared enum types.
-- See docs/db/schema.md §2.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

CREATE TYPE user_role        AS ENUM ('buyer', 'syndicator', 'operator');
CREATE TYPE horse_status     AS ENUM ('draft', 'pending_review', 'active', 'sold', 'withdrawn');
CREATE TYPE horse_sex        AS ENUM ('colt', 'filly', 'gelding', 'mare', 'stallion');
CREATE TYPE horse_colour     AS ENUM ('bay', 'brown', 'chestnut', 'grey', 'black', 'roan');
CREATE TYPE syndicator_tier  AS ENUM ('basic', 'premium', 'platinum', 'partner');
CREATE TYPE enquiry_outcome  AS ENUM ('pending', 'contacted', 'share_purchased', 'rejected', 'no_response');
CREATE TYPE owner_experience AS ENUM ('none', 'one_to_two', 'three_plus');
CREATE TYPE search_frequency AS ENUM ('off', 'daily', 'weekly');
CREATE TYPE payment_status   AS ENUM ('requires_action', 'processing', 'succeeded', 'failed', 'refunded');
CREATE TYPE afsl_status      AS ENUM ('unverified', 'pending', 'verified', 'suspended', 'expired');
