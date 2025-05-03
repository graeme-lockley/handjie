# H3: Multi-Agent Development Framework

## 🚀 Overview

H3 is an experimental, open-source multi-agent development framework designed to reimagine software creation through intelligent, collaborative problem-solving.
It uses a team of specialized AI agents that work together, each with specific roles in the development process, configured through a simple YAML file.

The framework allows you to define agents with different skills and responsibilities (like planning, coding, testing, and documentation) that can coordinate to
solve complex software development tasks.

## 🏃 Running H3 Locally

### Prerequisites

- [Deno](https://deno.land/manual/getting_started/installation) installed on your system
- For Anthropic Claude models: An Anthropic API key (set as environment variable)

### Setting Up

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/h3.git
   cd h3
   ```

2. If using Anthropic Claude models, set your API key as an environment variable:
   ```bash
   export ANTHROPIC_API_KEY=your_api_key_here
   ```

3. Configure your agents in `agents.yaml` (see the sample file for reference)

### Running the CLI

Start the CLI with:

```bash
deno run --allow-all src/cli.ts
```

#### Command Line Options

- `--name` or `-n`: Specify a primary agent name (default: first agent in agents.yaml)
- `--model` or `-m`: Specify the model to use (default: claude-3.5-sonnet)

Example:

```bash
deno run --allow-all src/cli.ts --name Typer --model llama3.2:latest
```

#### CLI Slash Commands

While running the CLI, you can use these commands:

- `/clear [agent]` - Clear conversation context (for all agents or a specific one)
- `/agents` - List all available agents
- `/use [agent]` - Change the primary agent
- `/help` - Show the help message
- `exit` or `quit` - Exit the application

## 🤖 Supported LLM Models

### Ollama Models

- `qwq:latest`: Efficient, fast conversational model
- `mistral:latest`: Powerful, versatile reasoning model
- `llama3.1:latest`: Advanced general-purpose model
- `llama3.2:latest`: Advanced general-purpose model
- `deepseek-r1:14b`: High-performance reasoning model
- `qwen2.5-coder:14b`: Specialized coding assistant

### Anthropic Claude Models

- `claude-3.7-sonnet`: Advanced AI assistant with exceptional reasoning (requires API key)
- `claude-3.5-sonnet`: Sophisticated content creation and analysis model (requires API key)

## 🔬 Technical Architecture

- **Runtime**: Deno
- **Language**: TypeScript
- **Architecture**: Agent-based, event-driven
- **Configuration**: YAML-driven agent definitions
- **Communication**: Stateless message passing between agents

## 👥 How to Contribute

We welcome contributions from the community! Here's how you can contribute:

1. **Fork the Repository**: Create your own fork of the project.

2. **Create a Branch**: Make your changes in a new branch.
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**: Implement your feature or fix a bug.

4. **Write Tests**: Ensure your code is properly tested.

5. **Run Tests**: Make sure all tests pass.
   ```bash
   deno test --allow-env
   ```

6. **Submit a Pull Request**: Open a PR against the main repository.

7. **Code Review**: Wait for a maintainer to review your PR.

### Development Guidelines

- Follow TypeScript best practices
- Document your code with comments and update the README if necessary
- Keep your PRs focused on a single change to simplify review
- Respect the existing code style and architecture

## 📝 License

MIT License

Copyright (c) 2023-2025 H3 Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR
A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
