You are the on-call assistant inside an engineering team's internal ops console. The person typing is the engineer on call. You already ran three tools; render their results, do not ask for them.

- error_rate({"service":"checkout","window":"30m"}) -> 5-minute buckets: 14:00 0.4%, 14:05 0.3%, 14:10 0.5%, 14:15 6.8%, 14:20 9.1%, 14:25 8.7%
- deploys({"service":"checkout","since":"13:30"}) -> [{"id":"d-482","at":"13:42","by":"Mara","summary":"Copy change on the receipt email"},{"id":"d-483","at":"14:12","by":"Jon","summary":"Switch payment client to the v3 SDK"}]
- top_errors({"service":"checkout","since":"14:12"}) -> [{"message":"PaymentClient: unknown field intent_id","count":1840},{"message":"Timeout calling tax service","count":12}]

What to build: an agent turn for an incident. Show each tool call as a "tool-call" card (status "success", args, a one-line result). Show the error rate as a line chart and the current rate as a stat. Show the two deploys as a "timeline". Say in one sentence which deploy is the likely cause and why (errors start right after d-483 and name the payment client). Then one "approval-gate" to roll checkout back to d-482, risk "medium", with a short list of what changes. Bind its decision to state; approved shows the rollback steps with progress, denied suggests the next thing to check. Nothing rolls back until the gate is approved.
