CREATE TABLE "areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"parent_id" integer,
	"name" varchar(120) NOT NULL,
	"description" text,
	"width_cm" integer,
	"depth_cm" integer,
	"height_cm" integer,
	"address" text,
	"qr_code" varchar(12) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "areas_qr_code_unique" UNIQUE("qr_code"),
	CONSTRAINT "areas_width_positive" CHECK ("areas"."width_cm" IS NULL OR "areas"."width_cm" > 0),
	CONSTRAINT "areas_depth_positive" CHECK ("areas"."depth_cm" IS NULL OR "areas"."depth_cm" > 0),
	CONSTRAINT "areas_height_positive" CHECK ("areas"."height_cm" IS NULL OR "areas"."height_cm" > 0)
);
--> statement-breakpoint
CREATE TABLE "household_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"created_by" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "household_members" (
	"household_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(10) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_members_household_id_user_id_pk" PRIMARY KEY("household_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_tags" (
	"item_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "item_tags_item_id_tag_id_pk" PRIMARY KEY("item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"area_id" integer,
	"name" varchar(120) NOT NULL,
	"description" text,
	"width_cm" integer,
	"depth_cm" integer,
	"height_cm" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_quantity_positive" CHECK ("items"."quantity" >= 1),
	CONSTRAINT "items_width_positive" CHECK ("items"."width_cm" IS NULL OR "items"."width_cm" > 0),
	CONSTRAINT "items_depth_positive" CHECK ("items"."depth_cm" IS NULL OR "items"."depth_cm" > 0),
	CONSTRAINT "items_height_positive" CHECK ("items"."height_cm" IS NULL OR "items"."height_cm" > 0)
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"area_id" integer,
	"item_id" integer,
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_exactly_one_owner" CHECK (("photos"."area_id" IS NULL) <> ("photos"."item_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"name" varchar(60) NOT NULL,
	"color" varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"locale" varchar(2) DEFAULT 'en' NOT NULL,
	"active_household_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_parent_id_areas_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_active_household_id_households_id_fk" FOREIGN KEY ("active_household_id") REFERENCES "public"."households"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "areas_household_parent_idx" ON "areas" USING btree ("household_id","parent_id");--> statement-breakpoint
CREATE INDEX "household_members_user_idx" ON "household_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "item_tags_tag_idx" ON "item_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "items_household_area_idx" ON "items" USING btree ("household_id","area_id");--> statement-breakpoint
CREATE INDEX "photos_area_idx" ON "photos" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "photos_item_idx" ON "photos" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_household_name_idx" ON "tags" USING btree ("household_id",lower("name"));