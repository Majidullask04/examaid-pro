from duckduckgo_search import AsyncDDGS
import asyncio

async def main():
    async with AsyncDDGS() as ddgs:
        results = [r async for r in ddgs.text('JNTUH CS important questions', max_results=2)]
        print(results)

asyncio.run(main())
