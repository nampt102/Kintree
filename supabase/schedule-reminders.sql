-- Đặt lịch gửi nhắc giỗ (change anniversary-push, design D3): 00:00 UTC = 7:00 giờ Việt Nam, thử lại lúc 04:00 UTC.
-- Chạy bằng psql với hai biến: psql -v url=<địa chỉ function send-reminders> -v key=<REMINDER_CRON_KEY> -f supabase/schedule-reminders.sql
-- Local: pnpm reminders:schedule. Khi triển khai thật: dán vào SQL editor (thay :'url' và :'key' bằng giá trị thật).
-- Không nằm trong migration vì địa chỉ và khoá khác nhau theo môi trường (khoá không vào repo).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname in ('send-reminders', 'send-reminders-retry');

select cron.schedule(
  n.name,
  n.at,
  format(
    'select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)',
    :'url',
    json_build_object('Content-Type', 'application/json', 'x-cron-key', :'key')::text,
    '{}'
  )
)
from (values ('send-reminders', '0 0 * * *'), ('send-reminders-retry', '0 4 * * *')) as n(name, at);

select jobname, schedule from cron.job order by jobname;
