CREATE TABLE "page_views" (
	"minute" timestamp with time zone NOT NULL,
	"path" text NOT NULL,
	"referrer_host" text DEFAULT '' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_views_minute_path_referrer_host_pk" PRIMARY KEY("minute","path","referrer_host")
);
--> statement-breakpoint
CREATE TABLE "page_visitors" (
	"minute" timestamp with time zone NOT NULL,
	"visitor" text NOT NULL,
	CONSTRAINT "page_visitors_minute_visitor_pk" PRIMARY KEY("minute","visitor")
);
