import { keywords } from '../common/keywords.js';

export class CreateRequest {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keywords = new keywords(page);

    // Static locators
    this.closeGuideIcon =
      '(//h2[text()="Workflow Studio Guide"]//following::button)[1]';

    this.CreateRequestBtn = '//p[text()="Create a Request"]';
    this.ContinueButton = '//p[text()="Continue"]';
    this.SubmitAns = '//p[text()="Submit"]';

    this.SuccessMsg = '//h2[contains(@id,"headlessui-dialog-title")]';
    this.GotoReqDetails = '//p[text()="Go to Request Details"]';

    this.StartButton = '//p[contains(text(),"Start")]';
    this.ApproveBtn = '//*[text()="Approve"]';
  }

  /* ===========================
     DYNAMIC LOCATORS
  =========================== */

  getWorkflowLocator(workflowName) {
    return `//span[text()="${workflowName}"]`;
  }

  getQuestionInput(questionText) {
    return `(//*[text()="${questionText}"]
            //following::input[1])`;
  }

  getDateInputByQuestion(questionText) {
    return `(//*[text()="${questionText}"]
            //following::input)[1]`;
  }

  getDropdownByQuestion(questionText) {
    return `//*[text()="${questionText}"]
            //following::button[contains(@id,"headlessui-listbox-button")]`;
  }

  getDropdownOption(optionText) {
    return `//span[text()="${optionText}"]`;
  }

  getTaskByName(taskName) {
    return `//p[contains(text(),"${taskName}") and contains(text(),"Start")]`;
  }

  getTaskQuestionInput(questionText) {
    return `//span[text()="${questionText}"]//following::input`;
  }

  getRadioOption(questionText, optionText) {
  return `//span[text()="${questionText}"]//following::span[text()="${optionText}"]`;
}

  /* ===========================
     MAIN FLOW
  =========================== */

  async CreateNewRequest(data) {
    // Close guide popup if present
    if (await this.keywords.isVisible(this.closeGuideIcon, 5000)) {
      await this.keywords.click(this.closeGuideIcon, 'Close Guide');
    }

    await this.keywords.click(this.CreateRequestBtn, 'Create Request');

    await this.keywords.click(
      this.getWorkflowLocator(data.WorkflowName),
      `Select Workflow → ${data.WorkflowName}`
    );

    await this.keywords.click(this.ContinueButton, 'Continue');

    /* ===========================
       INTAKE QUESTIONS (FIXED)
    =========================== */

   const totalSections = 4; // based on Excel

for (let i = 1; i <= totalSections; i++) {
  const question = data[`Section${i}QueName`];
  const answer = data[`Section${i}Answer`];

  console.log(`➡️ Question: ${question}`);
  console.log(`➡️ Answer: ${answer}`);

  if (!question || !answer) continue;

  let answered = false;

  // ---- TEXT / LONG TEXT ----
  if (
    await this.keywords.isVisible(
      this.getQuestionInput(question),
      2000
    )
  ) {
    await this.keywords.fill(
      this.getQuestionInput(question),
      answer,
      question
    );
    answered = true;
  }

  // ---- DATE FIELD ----
  else if (
    await this.keywords.isVisible(
      this.getDateInputByQuestion(question),
      2000
    )
  ) {
    await this.keywords.fill(
      this.getDateInputByQuestion(question),
      answer,
      question
    );
    answered = true;
  }

  // ---- RADIO / SINGLE CHOICE (🔥 FIX) ----
  else if (
    await this.keywords.isVisible(
      this.getRadioOption(question, answer),
      2000
    )
  ) {
    await this.keywords.click(
      this.getRadioOption(question, answer),
      `${question} → ${answer}`
    );
    answered = true;
  }

  // ---- DROPDOWN ----
  else if (
    await this.keywords.isVisible(
      this.getDropdownByQuestion(question),
      2000
    )
  ) {
    await this.keywords.click(
      this.getDropdownByQuestion(question),
      question
    );

    await this.keywords.click(
      this.getDropdownOption(answer),
      answer
    );
    answered = true;
  }

  if (!answered) {
    throw new Error(`❌ Could not answer question: ${question}`);
  }

  if( i < totalSections ) {

  await this.keywords.click(this.ContinueButton, 'Continue');

  }else{

    await this.keywords.click(this.SubmitAns, 'Submit');


  }
}

    // Submit appears ONLY after all intake sections are completed
  
    await this.keywords.waitUntilVisible(
      this.SuccessMsg,
      data.WorkflowPopup
    );

    // await this.keywords.click(
    //   this.GotoReqDetails,
    //   'Go To Request Details'
    // );

    await this.handleAllTasks(data);
  }

  /* ===========================
     TASK EXECUTION
  =========================== */

  async handleAllTasks(data) {
    const tasks = [
      data.Task1Name,
      data.Task2Name,
      data.Task3Name
    ].filter(Boolean);

    for (const taskName of tasks) {
      const taskLocator = this.getTaskByName(taskName);

      if (await this.keywords.isVisible(taskLocator, 5000)) {
        await this.keywords.click(
          this.StartButton,
          `Start ${taskName}`
        );

        await this.handleTaskByName(taskName, data);
        await this.waitAfterTask();
      }
    }

    console.log('✅ All tasks completed');
  }

  async waitAfterTask() {
    await this.page.waitForTimeout(2000);
  }

  /* ===========================
     GENERIC TASK HANDLER
  =========================== */

  async handleTaskByName(taskName, data) {
    let question = '';
    let answer = '';

    switch (taskName) {
      case data.Task1Name:
        question = data.Task1Section1Que1;
        answer = data.Task1Answer;
        break;

      case data.Task2Name:
        question = data.Task2Section1Que1;
        answer = data.Task2Answer;
        break;

      case data.Task3Name:
        question = data.Task3Section1Que1;
        answer = data.Task3Answer;
        break;

      default:
        throw new Error(`No handler mapped for task → ${taskName}`);
    }

    await this.keywords.waitUntilVisible(
      this.getTaskQuestionInput(question),
      question
    );

    await this.keywords.fill(
      this.getTaskQuestionInput(question),
      answer,
      question
    );

    await this.approveTask(taskName);
  }

  /* ===========================
     APPROVAL
  =========================== */

  async approveTask(taskName) {
    await this.keywords.click(
      this.ApproveBtn,
      `Approve ${taskName}`
    );

    let toastText = '';
    try {
      toastText = await this.keywords.waitForAnyToast(
        `${taskName} Toast`,
        10000
      );
    } catch {}

    console.log(`ℹ️ ${taskName} toast → ${toastText}`);
  }
}
