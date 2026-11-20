# Seed database using import tasks unless explicitly skipped (e.g. render-build / CI)
return if ENV["SKIP_SEEDS"] == "1"

Rails.application.load_tasks unless Rake::Task.task_defined?("import:all")
Rake::Task["import:all"].invoke
