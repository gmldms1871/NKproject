create table "public"."form_fields" (
    "id" uuid not null default gen_random_uuid(),
    "form_template_id" uuid,
    "field_name" character varying not null,
    "field_type" character varying not null,
    "is_required" boolean default false,
    "options" jsonb,
    "filled_by_role" character varying not null,
    "order_index" integer not null,
    "placeholder" text,
    "help_text" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."form_fields" enable row level security;

create table "public"."form_instances" (
    "id" uuid not null default gen_random_uuid(),
    "form_template_id" uuid,
    "student_id" uuid,
    "group_id" uuid,
    "status" character varying default 'pending'::character varying,
    "class_average" numeric(5,2),
    "submitted_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
);


alter table "public"."form_instances" enable row level security;

create table "public"."form_responses" (
    "id" uuid not null default gen_random_uuid(),
    "form_instance_id" uuid,
    "form_field_id" uuid,
    "value" text,
    "submitted_by" uuid,
    "submitted_by_role" character varying,
    "submitted_at" timestamp with time zone default now()
);


alter table "public"."form_responses" enable row level security;

create table "public"."form_templates" (
    "id" uuid not null default gen_random_uuid(),
    "group_id" uuid,
    "title" character varying not null,
    "description" text,
    "exam_type" character varying,
    "test_range" text,
    "total_questions" integer,
    "difficulty_level" integer,
    "created_by" uuid,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."form_templates" enable row level security;

create table "public"."question_concepts" (
    "id" uuid not null default gen_random_uuid(),
    "form_template_id" uuid,
    "question_number" integer not null,
    "concept" text not null,
    "difficulty_level" character varying,
    "created_at" timestamp with time zone default now()
);


alter table "public"."question_concepts" enable row level security;

create table "public"."student_reports" (
    "id" uuid not null default gen_random_uuid(),
    "form_instance_id" uuid,
    "student_id" uuid,
    "group_id" uuid,
    "raw_report" text,
    "ai_report" text,
    "final_report" text,
    "status" character varying default 'draft'::character varying,
    "reviewed_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."student_reports" enable row level security;

create table "public"."students" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying not null,
    "student_number" character varying,
    "class_name" character varying,
    "group_id" uuid,
    "phone" character varying,
    "parent_phone" character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."students" enable row level security;

CREATE UNIQUE INDEX form_fields_pkey ON public.form_fields USING btree (id);

CREATE UNIQUE INDEX form_instances_pkey ON public.form_instances USING btree (id);

CREATE UNIQUE INDEX form_responses_pkey ON public.form_responses USING btree (id);

CREATE UNIQUE INDEX form_templates_pkey ON public.form_templates USING btree (id);

CREATE INDEX idx_form_fields_order ON public.form_fields USING btree (form_template_id, order_index);

CREATE INDEX idx_form_fields_template_id ON public.form_fields USING btree (form_template_id);

CREATE INDEX idx_form_instances_group_id ON public.form_instances USING btree (group_id);

CREATE INDEX idx_form_instances_student_id ON public.form_instances USING btree (student_id);

CREATE INDEX idx_form_instances_template_id ON public.form_instances USING btree (form_template_id);

CREATE INDEX idx_form_responses_instance_id ON public.form_responses USING btree (form_instance_id);

CREATE INDEX idx_form_templates_group_id ON public.form_templates USING btree (group_id);

CREATE INDEX idx_question_concepts_template_id ON public.question_concepts USING btree (form_template_id);

CREATE INDEX idx_student_reports_instance_id ON public.student_reports USING btree (form_instance_id);

CREATE INDEX idx_student_reports_student_id ON public.student_reports USING btree (student_id);

CREATE INDEX idx_students_class_name ON public.students USING btree (class_name);

CREATE INDEX idx_students_group_id ON public.students USING btree (group_id);

CREATE UNIQUE INDEX question_concepts_pkey ON public.question_concepts USING btree (id);

CREATE UNIQUE INDEX student_reports_pkey ON public.student_reports USING btree (id);

CREATE UNIQUE INDEX students_pkey ON public.students USING btree (id);

CREATE UNIQUE INDEX students_student_number_key ON public.students USING btree (student_number);

alter table "public"."form_fields" add constraint "form_fields_pkey" PRIMARY KEY using index "form_fields_pkey";

alter table "public"."form_instances" add constraint "form_instances_pkey" PRIMARY KEY using index "form_instances_pkey";

alter table "public"."form_responses" add constraint "form_responses_pkey" PRIMARY KEY using index "form_responses_pkey";

alter table "public"."form_templates" add constraint "form_templates_pkey" PRIMARY KEY using index "form_templates_pkey";

alter table "public"."question_concepts" add constraint "question_concepts_pkey" PRIMARY KEY using index "question_concepts_pkey";

alter table "public"."student_reports" add constraint "student_reports_pkey" PRIMARY KEY using index "student_reports_pkey";

alter table "public"."students" add constraint "students_pkey" PRIMARY KEY using index "students_pkey";

alter table "public"."form_fields" add constraint "form_fields_field_type_check" CHECK (((field_type)::text = ANY ((ARRAY['text'::character varying, 'textarea'::character varying, 'number'::character varying, 'select'::character varying, 'rating'::character varying, 'checkbox'::character varying, 'radio'::character varying])::text[]))) not valid;

alter table "public"."form_fields" validate constraint "form_fields_field_type_check";

alter table "public"."form_fields" add constraint "form_fields_filled_by_role_check" CHECK (((filled_by_role)::text = ANY ((ARRAY['student'::character varying, 'teacher'::character varying, 'part_time'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "public"."form_fields" validate constraint "form_fields_filled_by_role_check";

alter table "public"."form_fields" add constraint "form_fields_form_template_id_fkey" FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE not valid;

alter table "public"."form_fields" validate constraint "form_fields_form_template_id_fkey";

alter table "public"."form_instances" add constraint "form_instances_form_template_id_fkey" FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE not valid;

alter table "public"."form_instances" validate constraint "form_instances_form_template_id_fkey";

alter table "public"."form_instances" add constraint "form_instances_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE not valid;

alter table "public"."form_instances" validate constraint "form_instances_group_id_fkey";

alter table "public"."form_instances" add constraint "form_instances_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'reviewed'::character varying])::text[]))) not valid;

alter table "public"."form_instances" validate constraint "form_instances_status_check";

alter table "public"."form_instances" add constraint "form_instances_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."form_instances" validate constraint "form_instances_student_id_fkey";

alter table "public"."form_responses" add constraint "form_responses_form_field_id_fkey" FOREIGN KEY (form_field_id) REFERENCES form_fields(id) ON DELETE CASCADE not valid;

alter table "public"."form_responses" validate constraint "form_responses_form_field_id_fkey";

alter table "public"."form_responses" add constraint "form_responses_form_instance_id_fkey" FOREIGN KEY (form_instance_id) REFERENCES form_instances(id) ON DELETE CASCADE not valid;

alter table "public"."form_responses" validate constraint "form_responses_form_instance_id_fkey";

alter table "public"."form_responses" add constraint "form_responses_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) not valid;

alter table "public"."form_responses" validate constraint "form_responses_submitted_by_fkey";

alter table "public"."form_responses" add constraint "form_responses_submitted_by_role_check" CHECK (((submitted_by_role)::text = ANY ((ARRAY['student'::character varying, 'teacher'::character varying, 'part_time'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "public"."form_responses" validate constraint "form_responses_submitted_by_role_check";

alter table "public"."form_templates" add constraint "form_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."form_templates" validate constraint "form_templates_created_by_fkey";

alter table "public"."form_templates" add constraint "form_templates_difficulty_level_check" CHECK (((difficulty_level >= 1) AND (difficulty_level <= 5))) not valid;

alter table "public"."form_templates" validate constraint "form_templates_difficulty_level_check";

alter table "public"."form_templates" add constraint "form_templates_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE not valid;

alter table "public"."form_templates" validate constraint "form_templates_group_id_fkey";

alter table "public"."question_concepts" add constraint "question_concepts_difficulty_level_check" CHECK (((difficulty_level)::text = ANY ((ARRAY['I'::character varying, 'M'::character varying, 'N'::character varying, 'K'::character varying])::text[]))) not valid;

alter table "public"."question_concepts" validate constraint "question_concepts_difficulty_level_check";

alter table "public"."question_concepts" add constraint "question_concepts_form_template_id_fkey" FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE not valid;

alter table "public"."question_concepts" validate constraint "question_concepts_form_template_id_fkey";

alter table "public"."student_reports" add constraint "student_reports_form_instance_id_fkey" FOREIGN KEY (form_instance_id) REFERENCES form_instances(id) ON DELETE CASCADE not valid;

alter table "public"."student_reports" validate constraint "student_reports_form_instance_id_fkey";

alter table "public"."student_reports" add constraint "student_reports_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE not valid;

alter table "public"."student_reports" validate constraint "student_reports_group_id_fkey";

alter table "public"."student_reports" add constraint "student_reports_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) not valid;

alter table "public"."student_reports" validate constraint "student_reports_reviewed_by_fkey";

alter table "public"."student_reports" add constraint "student_reports_status_check" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'ai_generated'::character varying, 'reviewed'::character varying, 'published'::character varying])::text[]))) not valid;

alter table "public"."student_reports" validate constraint "student_reports_status_check";

alter table "public"."student_reports" add constraint "student_reports_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."student_reports" validate constraint "student_reports_student_id_fkey";

alter table "public"."students" add constraint "students_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE not valid;

alter table "public"."students" validate constraint "students_group_id_fkey";

alter table "public"."students" add constraint "students_student_number_key" UNIQUE using index "students_student_number_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."form_fields" to "anon";

grant insert on table "public"."form_fields" to "anon";

grant references on table "public"."form_fields" to "anon";

grant select on table "public"."form_fields" to "anon";

grant trigger on table "public"."form_fields" to "anon";

grant truncate on table "public"."form_fields" to "anon";

grant update on table "public"."form_fields" to "anon";

grant delete on table "public"."form_fields" to "authenticated";

grant insert on table "public"."form_fields" to "authenticated";

grant references on table "public"."form_fields" to "authenticated";

grant select on table "public"."form_fields" to "authenticated";

grant trigger on table "public"."form_fields" to "authenticated";

grant truncate on table "public"."form_fields" to "authenticated";

grant update on table "public"."form_fields" to "authenticated";

grant delete on table "public"."form_fields" to "service_role";

grant insert on table "public"."form_fields" to "service_role";

grant references on table "public"."form_fields" to "service_role";

grant select on table "public"."form_fields" to "service_role";

grant trigger on table "public"."form_fields" to "service_role";

grant truncate on table "public"."form_fields" to "service_role";

grant update on table "public"."form_fields" to "service_role";

grant delete on table "public"."form_instances" to "anon";

grant insert on table "public"."form_instances" to "anon";

grant references on table "public"."form_instances" to "anon";

grant select on table "public"."form_instances" to "anon";

grant trigger on table "public"."form_instances" to "anon";

grant truncate on table "public"."form_instances" to "anon";

grant update on table "public"."form_instances" to "anon";

grant delete on table "public"."form_instances" to "authenticated";

grant insert on table "public"."form_instances" to "authenticated";

grant references on table "public"."form_instances" to "authenticated";

grant select on table "public"."form_instances" to "authenticated";

grant trigger on table "public"."form_instances" to "authenticated";

grant truncate on table "public"."form_instances" to "authenticated";

grant update on table "public"."form_instances" to "authenticated";

grant delete on table "public"."form_instances" to "service_role";

grant insert on table "public"."form_instances" to "service_role";

grant references on table "public"."form_instances" to "service_role";

grant select on table "public"."form_instances" to "service_role";

grant trigger on table "public"."form_instances" to "service_role";

grant truncate on table "public"."form_instances" to "service_role";

grant update on table "public"."form_instances" to "service_role";

grant delete on table "public"."form_responses" to "anon";

grant insert on table "public"."form_responses" to "anon";

grant references on table "public"."form_responses" to "anon";

grant select on table "public"."form_responses" to "anon";

grant trigger on table "public"."form_responses" to "anon";

grant truncate on table "public"."form_responses" to "anon";

grant update on table "public"."form_responses" to "anon";

grant delete on table "public"."form_responses" to "authenticated";

grant insert on table "public"."form_responses" to "authenticated";

grant references on table "public"."form_responses" to "authenticated";

grant select on table "public"."form_responses" to "authenticated";

grant trigger on table "public"."form_responses" to "authenticated";

grant truncate on table "public"."form_responses" to "authenticated";

grant update on table "public"."form_responses" to "authenticated";

grant delete on table "public"."form_responses" to "service_role";

grant insert on table "public"."form_responses" to "service_role";

grant references on table "public"."form_responses" to "service_role";

grant select on table "public"."form_responses" to "service_role";

grant trigger on table "public"."form_responses" to "service_role";

grant truncate on table "public"."form_responses" to "service_role";

grant update on table "public"."form_responses" to "service_role";

grant delete on table "public"."form_templates" to "anon";

grant insert on table "public"."form_templates" to "anon";

grant references on table "public"."form_templates" to "anon";

grant select on table "public"."form_templates" to "anon";

grant trigger on table "public"."form_templates" to "anon";

grant truncate on table "public"."form_templates" to "anon";

grant update on table "public"."form_templates" to "anon";

grant delete on table "public"."form_templates" to "authenticated";

grant insert on table "public"."form_templates" to "authenticated";

grant references on table "public"."form_templates" to "authenticated";

grant select on table "public"."form_templates" to "authenticated";

grant trigger on table "public"."form_templates" to "authenticated";

grant truncate on table "public"."form_templates" to "authenticated";

grant update on table "public"."form_templates" to "authenticated";

grant delete on table "public"."form_templates" to "service_role";

grant insert on table "public"."form_templates" to "service_role";

grant references on table "public"."form_templates" to "service_role";

grant select on table "public"."form_templates" to "service_role";

grant trigger on table "public"."form_templates" to "service_role";

grant truncate on table "public"."form_templates" to "service_role";

grant update on table "public"."form_templates" to "service_role";

grant delete on table "public"."question_concepts" to "anon";

grant insert on table "public"."question_concepts" to "anon";

grant references on table "public"."question_concepts" to "anon";

grant select on table "public"."question_concepts" to "anon";

grant trigger on table "public"."question_concepts" to "anon";

grant truncate on table "public"."question_concepts" to "anon";

grant update on table "public"."question_concepts" to "anon";

grant delete on table "public"."question_concepts" to "authenticated";

grant insert on table "public"."question_concepts" to "authenticated";

grant references on table "public"."question_concepts" to "authenticated";

grant select on table "public"."question_concepts" to "authenticated";

grant trigger on table "public"."question_concepts" to "authenticated";

grant truncate on table "public"."question_concepts" to "authenticated";

grant update on table "public"."question_concepts" to "authenticated";

grant delete on table "public"."question_concepts" to "service_role";

grant insert on table "public"."question_concepts" to "service_role";

grant references on table "public"."question_concepts" to "service_role";

grant select on table "public"."question_concepts" to "service_role";

grant trigger on table "public"."question_concepts" to "service_role";

grant truncate on table "public"."question_concepts" to "service_role";

grant update on table "public"."question_concepts" to "service_role";

grant delete on table "public"."student_reports" to "anon";

grant insert on table "public"."student_reports" to "anon";

grant references on table "public"."student_reports" to "anon";

grant select on table "public"."student_reports" to "anon";

grant trigger on table "public"."student_reports" to "anon";

grant truncate on table "public"."student_reports" to "anon";

grant update on table "public"."student_reports" to "anon";

grant delete on table "public"."student_reports" to "authenticated";

grant insert on table "public"."student_reports" to "authenticated";

grant references on table "public"."student_reports" to "authenticated";

grant select on table "public"."student_reports" to "authenticated";

grant trigger on table "public"."student_reports" to "authenticated";

grant truncate on table "public"."student_reports" to "authenticated";

grant update on table "public"."student_reports" to "authenticated";

grant delete on table "public"."student_reports" to "service_role";

grant insert on table "public"."student_reports" to "service_role";

grant references on table "public"."student_reports" to "service_role";

grant select on table "public"."student_reports" to "service_role";

grant trigger on table "public"."student_reports" to "service_role";

grant truncate on table "public"."student_reports" to "service_role";

grant update on table "public"."student_reports" to "service_role";

grant delete on table "public"."students" to "anon";

grant insert on table "public"."students" to "anon";

grant references on table "public"."students" to "anon";

grant select on table "public"."students" to "anon";

grant trigger on table "public"."students" to "anon";

grant truncate on table "public"."students" to "anon";

grant update on table "public"."students" to "anon";

grant delete on table "public"."students" to "authenticated";

grant insert on table "public"."students" to "authenticated";

grant references on table "public"."students" to "authenticated";

grant select on table "public"."students" to "authenticated";

grant trigger on table "public"."students" to "authenticated";

grant truncate on table "public"."students" to "authenticated";

grant update on table "public"."students" to "authenticated";

grant delete on table "public"."students" to "service_role";

grant insert on table "public"."students" to "service_role";

grant references on table "public"."students" to "service_role";

grant select on table "public"."students" to "service_role";

grant trigger on table "public"."students" to "service_role";

grant truncate on table "public"."students" to "service_role";

grant update on table "public"."students" to "service_role";

create policy "Admins and teachers can manage form fields"
on "public"."form_fields"
as permissive
for all
to public
using ((form_template_id IN ( SELECT ft.id
   FROM (form_templates ft
     JOIN group_members gm ON ((gm.group_id = ft.group_id)))
  WHERE ((gm.user_id = auth.uid()) AND ((gm.role = 'admin'::text) OR (gm.role = 'teacher'::text))))));


create policy "Users can view form fields"
on "public"."form_fields"
as permissive
for select
to public
using ((form_template_id IN ( SELECT ft.id
   FROM (form_templates ft
     JOIN group_members gm ON ((gm.group_id = ft.group_id)))
  WHERE (gm.user_id = auth.uid()))));


create policy "Admins and teachers can manage form instances"
on "public"."form_instances"
as permissive
for all
to public
using ((group_id IN ( SELECT gm.group_id
   FROM group_members gm
  WHERE ((gm.user_id = auth.uid()) AND ((gm.role = 'admin'::text) OR (gm.role = 'teacher'::text))))));


create policy "Users can view form instances in their groups"
on "public"."form_instances"
as permissive
for select
to public
using ((group_id IN ( SELECT group_members.group_id
   FROM group_members
  WHERE (group_members.user_id = auth.uid()))));


create policy "Users can submit form responses"
on "public"."form_responses"
as permissive
for insert
to public
with check (((form_instance_id IN ( SELECT fi.id
   FROM (form_instances fi
     JOIN group_members gm ON ((gm.group_id = fi.group_id)))
  WHERE (gm.user_id = auth.uid()))) AND (submitted_by = auth.uid())));


create policy "Users can update their own responses"
on "public"."form_responses"
as permissive
for update
to public
using ((submitted_by = auth.uid()));


create policy "Users can view form responses"
on "public"."form_responses"
as permissive
for select
to public
using ((form_instance_id IN ( SELECT fi.id
   FROM (form_instances fi
     JOIN group_members gm ON ((gm.group_id = fi.group_id)))
  WHERE (gm.user_id = auth.uid()))));


create policy "Admins and teachers can manage form templates"
on "public"."form_templates"
as permissive
for all
to public
using ((group_id IN ( SELECT gm.group_id
   FROM (group_members gm
     JOIN groups g ON ((g.id = gm.group_id)))
  WHERE ((gm.user_id = auth.uid()) AND ((gm.role = 'admin'::text) OR (gm.role = 'teacher'::text))))));


create policy "Users can view form templates in their groups"
on "public"."form_templates"
as permissive
for select
to public
using ((group_id IN ( SELECT group_members.group_id
   FROM group_members
  WHERE (group_members.user_id = auth.uid()))));


create policy "Admins and teachers can manage question concepts"
on "public"."question_concepts"
as permissive
for all
to public
using ((form_template_id IN ( SELECT ft.id
   FROM (form_templates ft
     JOIN group_members gm ON ((gm.group_id = ft.group_id)))
  WHERE ((gm.user_id = auth.uid()) AND ((gm.role = 'admin'::text) OR (gm.role = 'teacher'::text))))));


create policy "Users can view question concepts"
on "public"."question_concepts"
as permissive
for select
to public
using ((form_template_id IN ( SELECT ft.id
   FROM (form_templates ft
     JOIN group_members gm ON ((gm.group_id = ft.group_id)))
  WHERE (gm.user_id = auth.uid()))));


create policy "Admins and teachers can manage reports"
on "public"."student_reports"
as permissive
for all
to public
using ((group_id IN ( SELECT gm.group_id
   FROM group_members gm
  WHERE ((gm.user_id = auth.uid()) AND ((gm.role = 'admin'::text) OR (gm.role = 'teacher'::text))))));


create policy "Users can view reports in their groups"
on "public"."student_reports"
as permissive
for select
to public
using ((group_id IN ( SELECT group_members.group_id
   FROM group_members
  WHERE (group_members.user_id = auth.uid()))));


create policy "Admins and teachers can manage students"
on "public"."students"
as permissive
for all
to public
using ((group_id IN ( SELECT gm.group_id
   FROM (group_members gm
     JOIN groups g ON ((g.id = gm.group_id)))
  WHERE ((gm.user_id = auth.uid()) AND ((gm.role = 'admin'::text) OR (gm.role = 'teacher'::text))))));


create policy "Users can view students in their groups"
on "public"."students"
as permissive
for select
to public
using ((group_id IN ( SELECT group_members.group_id
   FROM group_members
  WHERE (group_members.user_id = auth.uid()))));


CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON public.form_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_reports_updated_at BEFORE UPDATE ON public.student_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


