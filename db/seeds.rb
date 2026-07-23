# Seed database using import tasks
Rails.application.load_tasks
Rake::Task["import:all"].invoke
