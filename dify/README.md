# Dify workflow for report AI analysis

This folder contains the Dify workflow template used by the report system.

## How it works

The report backend keeps the existing module-specific prompts and compact data shaping logic. Each AI button sends one request to Dify with:

- `module_key`
- `system_prompt`
- `user_prompt`
- `module_data_json`

Dify calls the company model and returns:

- `analysis_text`

## Import steps

1. In Dify, import `category-report-analysis-workflow.yml`.
2. Open the LLM node named `Generate module analysis`.
3. Select the company-approved model provider and model.
4. Publish the workflow.
5. Create or copy the workflow API key.
6. Configure the report system:

```env
DIFY_API_URL=https://dify.kapeixi.cn/v1
DIFY_API_KEY=your-workflow-api-key
DIFY_USER=category-weekly-report
```

Do not put the Dify API key in frontend code or in GitHub.

If your Dify version rejects the imported YAML, create the workflow manually with the same four start variables and one LLM node. Keep the output variable name as `analysis_text`.
