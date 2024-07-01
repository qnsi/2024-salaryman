import React, { FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

import "./index.css";
import { Session } from "@supabase/supabase-js";

console.log(process.env);
if (
  !process.env.REACT_APP_SUPABASE_URL ||
  !process.env.REACT_APP_SUPABASE_KEY
) {
  throw new Error(
    "REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY must be defined in .env",
  );
}
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || "",
  process.env.REACT_APP_SUPABASE_KEY || "",
);

enum ListType {
  Backlog,
  Today,
  Doing,
  Done,
}

function App() {
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  console.log("session: ", session);

  const signIn = async (password: string) => {
    console.log("Signin start");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "arturkesik@gmail.com",
      password,
    });
    console.log("signIn data: ", data);
    console.log("signIn error: ", error);
  };

  if (!session) {
    return <SignIn signIn={signIn} />;
  } else {
    return <MainApp />;
  }
}

function SignIn({ signIn }: { signIn: (password: string) => void }) {
  const [password, setPassword] = React.useState("");

  return (
    <form>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        onClick={(event) => {
          event.preventDefault();
          signIn(password);
          setPassword("");
        }}
      >
        Secret button
      </button>
    </form>
  );
}

function MainApp() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [filterText, setFilterText] = React.useState("");
  const [selectedTasks, setSelectedTasks] = React.useState<number[]>([0]);
  const [newTaskMode, setNewTaskMode] = React.useState(false);

  console.log("tasks: ", tasks);
  console.log("selectedtASKS: ", selectedTasks);

  React.useEffect(() => {
    getTasks();
  }, []);

  const refetchData = () => {
    getTasks();
  };
  // taskToTasks!public_taskToTasks_parent_id_fkey(tasks!taskToTasks(id))

  async function getTasks() {
    const { data } = await supabase.from("tasks").select(`id, text,
    taskToTasks!child_id(parent_id)
    `);
    console.log(data);
    if (data) {
      setTasks(
        data.map((task) => {
          return {
            id: task.id,
            name: task.text,
            parents: task.taskToTasks.map((parent: any) => parent.parent_id),
          } as Task;
        }),
      );
    }
  }

  async function createTask(text: string, parentId: number) {
    console.log("createTask: newTask text: ", text);
    const { data: tasks, error } = await supabase
      .from("tasks")
      .insert({ text })
      .select();
    // handleError
    if (parentId !== 0 && tasks && tasks[0]) {
      const { error } = await supabase
        .from("taskToTasks")
        .insert({ parent_id: parentId, child_id: tasks[0].id });
    }
    console.log("error: ", error);
    refetchData();
  }

  async function updateTask(taskId: number, newTask: Task) {
    console.log("updateTask: taskId: ", taskId, " newTask: ", newTask);
    const { error } = await supabase
      .from("tasks")
      .update({ text: newTask.name })
      .eq("id", taskId);
    // handleError
    console.log("error: ", error);
    refetchData();
  }

  async function deleteTask(taskId: number) {
    console.log("delete task: taskId: ", taskId);
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    // handleError
    console.log("error: ", error);
    refetchData();
  }

  React.useEffect(() => {
    console.log("tasks", tasks);
  }, [tasks]);

  const handleCreateTask = (text: string) => {
    createTask(text, 0);
  };

  // const filteredTasks = () => {
  //   return tasks.filter((task) => {
  //     return task.name.toLowerCase().includes(filterText.toLowerCase());
  //   });
  // };

  const filteredTasksWithParents = React.useMemo(() => {
    const lowerCaseFilterText = filterText.toLowerCase();

    // Step 1: Filter tasks that include the filter text
    const filteredTasks = new Set(
      tasks.filter((task) =>
        task.name.toLowerCase().includes(lowerCaseFilterText),
      ),
    );

    // Step 2: Find all parents of the filtered tasks
    const findAllParents = (task: Task, allParents: Set<number>) => {
      const parents = tasks.filter((t) => task.parents.includes(t.id));
      parents.forEach((parent) => {
        if (!allParents.has(parent.id)) {
          allParents.add(parent.id);
          findAllParents(parent, allParents);
        }
      });
    };

    // Collect all parent IDs for filtered tasks
    const allParentIds = new Set<number>();
    filteredTasks.forEach((task) => findAllParents(task, allParentIds));

    // Combine filtered tasks and their parents
    const resultTasks = tasks.filter(
      (task) => filteredTasks.has(task) || allParentIds.has(task.id),
    );

    return resultTasks;
  }, [tasks, filterText]);

  return (
    <>
      <label htmlFor="filter">Filter tasks</label>
      <input
        id="filter"
        type="text"
        value={filterText}
        onChange={(e) => setFilterText(e.currentTarget.value)}
      />
      <ul
        className="tree"
        style={{
          fontFamily: "system-ui, sans-serif",
          lineHeight: "1.8",
          backgroundColor: "#eee",
          margin: "0 10px 0 10px",
          padding: "10px",
          borderRadius: "10px",
        }}
      >
        <List
          parentTask={undefined}
          tasks={filteredTasksWithParents}
          createTask={createTask}
          updateTask={updateTask}
          deleteTask={deleteTask}
          setSelectedTasks={setSelectedTasks}
          intendationLevel={1}
        />
      </ul>
      {newTaskMode ? (
        <NewTaskCard
          createTask={handleCreateTask}
          setNewTaskMode={setNewTaskMode}
        />
      ) : (
        <button
          className={"newTaskCard"}
          style={{
            backgroundColor: "#fff",
            margin: "10px 20px",
            padding: "5px",
            display: "block",
          }}
          onClick={() => setNewTaskMode(true)}
        >
          + Add new task
        </button>
      )}
    </>
  );
}

export default App;

type Task = {
  id: number;
  name: string;
  parents: Array<number>;
};

export const List = ({
  parentTask,
  tasks,
  updateTask,
  createTask,
  deleteTask,
  setSelectedTasks,
  intendationLevel,
}: {
  parentTask?: Task;
  tasks: Task[];
  updateTask: (taskId: number, newTask: Task) => void;
  createTask: (text: string, parentId: number) => void;
  deleteTask: (taskId: number) => void;
  setSelectedTasks: React.Dispatch<React.SetStateAction<number[]>>;
  intendationLevel: number;
}) => {
  const currentLevelTasks = parentTask
    ? tasks.filter((task) => task.parents.includes(parentTask.id))
    : tasks.filter((task) => task.parents.length === 0);

  return (
    <>
      {currentLevelTasks.map((task) => {
        return (
          <CardWithChildren
            parentTask={parentTask}
            tasks={tasks}
            updateTask={updateTask}
            createTask={createTask}
            deleteTask={deleteTask}
            setSelectedTasks={setSelectedTasks}
            intendationLevel={intendationLevel}
            task={task}
          />
        );
      })}
    </>
  );
};

const CardWithChildren = ({
  parentTask,
  tasks,
  updateTask,
  createTask,
  deleteTask,
  setSelectedTasks,
  intendationLevel,
  task,
}: {
  parentTask?: Task;
  tasks: Task[];
  updateTask: (taskId: number, newTask: Task) => void;
  createTask: (text: string, parentId: number) => void;
  deleteTask: (taskId: number) => void;
  setSelectedTasks: React.Dispatch<React.SetStateAction<number[]>>;
  intendationLevel: number;
  task: Task;
}) => {
  const [showChildren, setShowChildren] = React.useState(true);
  const taskChildren = (parentTask: Task) => {
    return tasks.filter((task) => task.parents.includes(parentTask.id));
  };

  const tasksHiddenNote =
    (taskChildren(task).length > 0 &&
      !showChildren &&
      `${taskChildren(task).length} tasks hidden`) ||
    "";

  return (
    <li>
      <Card
        key={task.name}
        task={task}
        updateTask={updateTask}
        deleteTask={deleteTask}
        createTask={createTask}
        setSelectedTasks={setSelectedTasks}
        setShowChildren={setShowChildren}
        parentId={parentTask?.id || 0}
        tasksHiddenNote={tasksHiddenNote}
      />
      {taskChildren(task).length > 0 && showChildren && (
        <ul>
          <List
            parentTask={task}
            tasks={tasks}
            updateTask={updateTask}
            createTask={createTask}
            deleteTask={deleteTask}
            setSelectedTasks={setSelectedTasks}
            intendationLevel={intendationLevel + 1}
          />
        </ul>
      )}
    </li>
  );
};

const Card = ({
  task,
  updateTask,
  deleteTask,
  setSelectedTasks,
  parentId,
  setShowChildren,
  createTask,
  tasksHiddenNote,
}: {
  task: Task;
  updateTask: (taskId: number, newTask: Task) => void;
  deleteTask: (taskId: number) => void;
  setSelectedTasks: React.Dispatch<React.SetStateAction<number[]>>;
  parentId: number;
  setShowChildren: React.Dispatch<React.SetStateAction<boolean>>;
  createTask: (text: string, parentId: number) => void;
  tasksHiddenNote: string;
}) => {
  const [editMode, setEditMode] = React.useState(false);
  const [newTaskMode, setNewTaskMode] = React.useState(false);
  const [taskText, setTaskText] = React.useState(task.name);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState(false);
  const [hover, setHover] = React.useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateTask(task.id, { ...task, name: taskText });
    setEditMode(false);
  };

  const handleDelete = () => {
    deleteTask(task.id);
    setDeleteConfirmation(false);
  };

  const handleClick = () => {
    console.log("parentId: ", parentId);
    setSelectedTasks((taskIds) => {
      console.log("taskIds: ", taskIds);
      const index = taskIds.indexOf(parentId);
      const subArray = taskIds.slice(0, index + 1);
      return subArray.concat([task.id]);
    });
  };

  const handleCreateTask = (text: string) => {
    createTask(text, task.id);
  };

  const handleEdit = () => {
    setEditMode(true);
    setHover(false);
  };

  return editMode ? (
    <form onSubmit={handleSubmit}>
      <input
        style={{
          margin: "10px 20px",
          padding: "5px",
          width: "70%",
        }}
        autoFocus={true}
        value={taskText}
        onChange={(e) => setTaskText(e.target.value)}
        onBlur={() => setEditMode(false)}
        type="text"
      />
    </form>
  ) : (
    <div>
      <div
        className={"card"}
        style={{
          width: "70%",
          backgroundColor: "#fff",
          display: "flex",
          justifyContent: "space-between",
          lineHeight: 1.2,
          padding: "5px",
          fontSize: 13,
          borderRadius: "5px",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => setShowChildren((old) => !old)}
      >
        <p style={{ margin: "0px" }}>
          <span onClick={handleEdit}>{task.name}</span>
          <span style={{ marginLeft: 20, color: "#aaa" }}>
            {tasksHiddenNote}
          </span>
        </p>
        {hover && (
          <div>
            {deleteConfirmation ? (
              <>
                <button onClick={handleDelete}>Y</button> |
                <button onClick={() => setDeleteConfirmation(false)}>N</button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmation(true);
                  }}
                >
                  X
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewTaskMode(true);
                  }}
                >
                  Add
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChildren((old) => !old);
                  }}
                >
                  Hide
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {newTaskMode && (
        <NewTaskCard
          createTask={handleCreateTask}
          setNewTaskMode={setNewTaskMode}
        />
      )}
    </div>
  );
};

const NewTaskCard = ({
  createTask,
  setNewTaskMode,
}: {
  createTask: (text: string) => void;
  setNewTaskMode: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [newTaskText, setNewTaskText] = React.useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: sent listType
    createTask(newTaskText);
    setNewTaskMode(false);
    setNewTaskText("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        style={{
          margin: "10px 20px",
          padding: "5px",
          display: "block",
        }}
        autoFocus={true}
        onChange={(e) => setNewTaskText(e.target.value)}
        onBlur={() => setNewTaskMode(false)}
        type="text"
      />
    </form>
  );
};
